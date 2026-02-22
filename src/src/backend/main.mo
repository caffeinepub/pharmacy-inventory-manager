import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Medicine = {
    name : Text;
    quantity : Int;
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
    quantity : Int;
    rate : Int;
    amount : Int;
    marginPercentage : Int;
    sgst : Int;
    cgst : Int;
    totalAmount : Int;
    expiryDate : Text;
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
    dilNumber : Text;
  };

  let medicines = Map.empty<Text, Medicine>();
  let doctors = Map.empty<Text, Doctor>();
  let invoices = Map.empty<Nat, Invoice>();
  var nextInvoiceNumber = 1;
  var firmSettings : ?FirmSettings = null;

  // Medicine management
  public shared ({ caller }) func addOrUpdateMedicine(
    name : Text,
    quantity : Int,
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

  public query ({ caller }) func getMedicine(name : Text) : async ?Medicine {
    medicines.get(name);
  };

  public query ({ caller }) func getAllMedicines() : async [Medicine] {
    medicines.values().toArray();
  };

  public shared ({ caller }) func reduceMedicineStock(name : Text, quantity : Int) : async () {
    switch (medicines.get(name)) {
      case (null) {
        Runtime.trap("Medicine not found");
      };
      case (?medicine) {
        let updatedMedicine : Medicine = {
          name = medicine.name;
          quantity = medicine.quantity - quantity;
          batchNumber = medicine.batchNumber;
          hsnCode = medicine.hsnCode;
          expiryDate = medicine.expiryDate;
          purchaseRate = medicine.purchaseRate;
          sellingRate = medicine.sellingRate;
          mrp = medicine.mrp;
        };
        medicines.add(name, updatedMedicine);
      };
    };
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
    let valuesIter = doctors.values();
    valuesIter.toArray();
  };

  // Invoice management
  public shared ({ caller }) func createInvoice(doctorName : Text, items : [(Text, Int)]) : async Nat {
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

        let baseAmount = medicine.sellingRate * quantity;
        let gstAmount = (baseAmount * 5) / 100;
        let sgst = gstAmount / 2;
        let cgst = gstAmount / 2;
        let totalAmount = baseAmount + gstAmount;

        {
          medicineName = medicine.name;
          batchNumber = medicine.batchNumber;
          hsnCode = medicine.hsnCode;
          quantity;
          rate = medicine.sellingRate;
          amount = baseAmount;
          marginPercentage = 0;
          sgst;
          cgst;
          totalAmount;
          expiryDate = medicine.expiryDate;
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

    let grandTotal = invoiceItems.foldLeft(
      Int.fromNat(0),
      func(acc, item) { acc + item.totalAmount },
    );

    let invoice : Invoice = {
      invoiceNumber = nextInvoiceNumber;
      doctorName;
      items = invoiceItems;
      totalAmount;
      totalSgst;
      totalCgst;
      grandTotal;
    };

    // Reduce medicine stock quantities (allow negative values)
    for ((medicineName, quantity) in items.values()) {
      await reduceMedicineStock(medicineName, quantity);
    };

    invoices.add(nextInvoiceNumber, invoice);
    nextInvoiceNumber += 1;
    invoice.invoiceNumber;
  };

  public shared ({ caller }) func deleteInvoice(invoiceNumber : Nat) : async () {
    if (not invoices.containsKey(invoiceNumber)) {
      Runtime.trap("Invoice not found");
    };
    invoices.remove(invoiceNumber);
  };

  public query ({ caller }) func getInvoice(invoiceNumber : Nat) : async ?Invoice {
    invoices.get(invoiceNumber);
  };

  public query ({ caller }) func getAllInvoices() : async [Invoice] {
    let valuesIter = invoices.values();
    valuesIter.toArray();
  };

  // Firm settings
  public shared ({ caller }) func updateFirmSettings(
    name : Text,
    address : Text,
    gstin : Text,
    contact : Text,
    email : Text,
    shippingAddress : Text,
    dilNumber : Text,
  ) : async () {
    let settings : FirmSettings = {
      name;
      address;
      gstin;
      contact;
      email;
      shippingAddress;
      dilNumber;
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
          dilNumber = "";
        };
      };
      case (?settings) { settings };
    };
  };
};
