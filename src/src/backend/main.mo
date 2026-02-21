import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Medicine = {
    name : Text;
    quantity : Nat;
    batchNumber : Text;
    hsnCode : Text;
    expiryDate : Text;
    purchaseRate : Int;
    sellingRate : Int;
    mrp : Int;
  };

  type Doctor = {
    name : Text;
    marginPercentage : Int;
  };

  type InvoiceItem = {
    medicineName : Text;
    batchNumber : Text;
    hsnCode : Text;
    quantity : Nat;
    rate : Int;
    amount : Int;
    marginPercentage : Int;
    sgst : Int;
    cgst : Int;
    totalAmount : Int;
  };

  type Invoice = {
    invoiceNumber : Nat;
    doctorName : Text;
    items : [InvoiceItem];
    totalAmount : Int;
    totalSgst : Int;
    totalCgst : Int;
    grandTotal : Int;
  };

  type FirmSettings = {
    name : Text;
    address : Text;
    gstin : Text;
    contact : Text;
    email : Text;
    shippingAddress : Text;
  };

  let medicines = Map.empty<Text, Medicine>();
  let doctors = Map.empty<Text, Doctor>();
  let invoices = Map.empty<Nat, Invoice>();
  var nextInvoiceNumber = 1;
  var firmSettings : ?FirmSettings = null;

  // Medicine management
  public shared ({ caller }) func addOrUpdateMedicine(
    name : Text,
    quantity : Nat,
    batchNumber : Text,
    hsnCode : Text,
    expiryDate : Text,
    purchaseRate : Int,
    sellingRate : Int,
    mrp : Int,
  ) : async () {
    let medicine : Medicine = {
      name;
      quantity;
      batchNumber;
      hsnCode;
      expiryDate;
      purchaseRate;
      sellingRate;
      mrp;
    };
    medicines.add(name, medicine);
  };

  public shared ({ caller }) func deleteMedicine(name : Text) : async () {
    if (not medicines.containsKey(name)) {
      Runtime.trap("Medicine not found");
    };
    medicines.remove(name);
  };

  public query ({ caller }) func getMedicine(name : Text) : async Medicine {
    switch (medicines.get(name)) {
      case (null) { Runtime.trap("Medicine not found") };
      case (?medicine) { medicine };
    };
  };

  public query ({ caller }) func getAllMedicines() : async [Medicine] {
    medicines.values().toArray();
  };

  // Doctor management
  public shared ({ caller }) func addOrUpdateDoctor(name : Text, marginPercentage : Int) : async () {
    let doctor : Doctor = {
      name;
      marginPercentage;
    };
    doctors.add(name, doctor);
  };

  public shared ({ caller }) func deleteDoctor(name : Text) : async () {
    if (not doctors.containsKey(name)) {
      Runtime.trap("Doctor not found");
    };
    doctors.remove(name);
  };

  public query ({ caller }) func getDoctor(name : Text) : async Doctor {
    switch (doctors.get(name)) {
      case (null) { Runtime.trap("Doctor not found") };
      case (?doctor) { doctor };
    };
  };

  public query ({ caller }) func getAllDoctors() : async [Doctor] {
    doctors.values().toArray();
  };

  // Invoice management
  public shared ({ caller }) func createInvoice(doctorName : Text, items : [(Text, Nat)]) : async Nat {
    let doctor = switch (doctors.get(doctorName)) {
      case (null) { Runtime.trap("Doctor not found") };
      case (?doctor) { doctor };
    };

    let invoiceItems = items.map(
      func((medicineName, quantity)) {
        let medicine = switch (medicines.get(medicineName)) {
          case (null) { Runtime.trap("Medicine not found: " # medicineName) };
          case (?medicine) { medicine };
        };

        let amount = medicine.sellingRate * quantity;
        let marginAmount = amount + (amount * doctor.marginPercentage) / 100;
        let gst = (marginAmount * 5) / 100;
        let sgst = gst / 2;
        let cgst = gst / 2;
        let total = marginAmount + gst;

        {
          medicineName = medicine.name;
          batchNumber = medicine.batchNumber;
          hsnCode = medicine.hsnCode;
          quantity;
          rate = medicine.sellingRate;
          amount;
          marginPercentage = doctor.marginPercentage;
          sgst;
          cgst;
          totalAmount = total;
        };
      }
    );

    let totalAmount = invoiceItems.foldLeft(
      Int.fromNat(0),
      func(acc, item) { acc + item.amount },
    );

    let totalSgst = invoiceItems.foldLeft(
      Int.fromNat(0),
      func(acc, item) { acc + item.sgst },
    );

    let totalCgst = invoiceItems.foldLeft(
      Int.fromNat(0),
      func(acc, item) { acc + item.cgst },
    );

    let grandTotal = totalAmount + totalSgst + totalCgst;

    let invoice : Invoice = {
      invoiceNumber = nextInvoiceNumber;
      doctorName;
      items = invoiceItems;
      totalAmount;
      totalSgst;
      totalCgst;
      grandTotal;
    };

    invoices.add(nextInvoiceNumber, invoice);
    nextInvoiceNumber += 1;
    invoice.invoiceNumber;
  };

  public query ({ caller }) func getInvoice(invoiceNumber : Nat) : async Invoice {
    switch (invoices.get(invoiceNumber)) {
      case (null) { Runtime.trap("Invoice not found") };
      case (?invoice) { invoice };
    };
  };

  public query ({ caller }) func getAllInvoices() : async [Invoice] {
    invoices.values().toArray();
  };

  // Firm settings
  public shared ({ caller }) func updateFirmSettings(
    name : Text,
    address : Text,
    gstin : Text,
    contact : Text,
    email : Text,
    shippingAddress : Text,
  ) : async () {
    let settings : FirmSettings = {
      name;
      address;
      gstin;
      contact;
      email;
      shippingAddress;
    };
    firmSettings := ?settings;
  };

  public query ({ caller }) func getFirmSettings() : async FirmSettings {
    switch (firmSettings) {
      case (null) {
        {
          name = "Default Firm";
          address = "Default Address";
          gstin = "DEFAULTGSTIN";
          contact = "0000000000";
          email = "default@example.com";
          shippingAddress = "Default Shipping Address";
        };
      };
      case (?settings) { settings };
    };
  };
};
