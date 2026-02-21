import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

module {
  type OldMedicine = {
    name : Text;
    quantity : Nat;
    batchNumber : Text;
    hsnCode : Text;
    expiryDate : Text;
    purchaseRate : Nat;
    sellingRate : Nat;
    mrp : Nat;
  };

  type OldDoctor = {
    name : Text;
    marginPercentage : Nat;
  };

  type OldInvoiceItem = {
    medicineName : Text;
    batchNumber : Text;
    hsnCode : Text;
    quantity : Nat;
    rate : Nat;
    amount : Nat;
    marginPercentage : Nat;
    sgst : Nat;
    cgst : Nat;
    totalAmount : Nat;
  };

  type OldInvoice = {
    invoiceNumber : Nat;
    doctorName : Text;
    items : [OldInvoiceItem];
    totalAmount : Nat;
    totalSgst : Nat;
    totalCgst : Nat;
    grandTotal : Nat;
  };

  type OldFirmSettings = {
    name : Text;
    address : Text;
    gstin : Text;
    contact : Text;
    email : Text;
  };

  type OldActor = {
    medicines : Map.Map<Text, OldMedicine>;
    doctors : Map.Map<Text, OldDoctor>;
    invoices : Map.Map<Nat, OldInvoice>;
    nextInvoiceNumber : Nat;
    firmSettings : ?OldFirmSettings;
  };

  type NewMedicine = {
    name : Text;
    quantity : Nat;
    batchNumber : Text;
    hsnCode : Text;
    expiryDate : Text;
    purchaseRate : Int;
    sellingRate : Int;
    mrp : Int;
  };

  type NewDoctor = {
    name : Text;
    marginPercentage : Int;
  };

  type NewInvoiceItem = {
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

  type NewInvoice = {
    invoiceNumber : Nat;
    doctorName : Text;
    items : [NewInvoiceItem];
    totalAmount : Int;
    totalSgst : Int;
    totalCgst : Int;
    grandTotal : Int;
  };

  type NewFirmSettings = {
    name : Text;
    address : Text;
    gstin : Text;
    contact : Text;
    email : Text;
    shippingAddress : Text;
  };

  type NewActor = {
    medicines : Map.Map<Text, NewMedicine>;
    doctors : Map.Map<Text, NewDoctor>;
    invoices : Map.Map<Nat, NewInvoice>;
    nextInvoiceNumber : Nat;
    firmSettings : ?NewFirmSettings;
  };

  public func run(old : OldActor) : NewActor {
    let newMedicines = old.medicines.map<Text, OldMedicine, NewMedicine>(
      func(_name, oldMedicine) {
        {
          oldMedicine with
          purchaseRate = oldMedicine.purchaseRate.toInt();
          sellingRate = oldMedicine.sellingRate.toInt();
          mrp = oldMedicine.mrp.toInt();
        };
      }
    );

    let newDoctors = old.doctors.map<Text, OldDoctor, NewDoctor>(
      func(_name, oldDoctor) {
        {
          oldDoctor with
          marginPercentage = oldDoctor.marginPercentage.toInt();
        };
      }
    );

    let newInvoices = old.invoices.map<Nat, OldInvoice, NewInvoice>(
      func(_invoiceNumber, oldInvoice) {
        {
          oldInvoice with
          totalAmount = oldInvoice.totalAmount.toInt();
          totalSgst = oldInvoice.totalSgst.toInt();
          totalCgst = oldInvoice.totalCgst.toInt();
          grandTotal = oldInvoice.grandTotal.toInt();
        };
      }
    );

    let newFirmSettings = switch (old.firmSettings) {
      case (null) { null };
      case (?oldSettings) {
        ?{
          oldSettings with
          shippingAddress = "Default Shipping Address";
        };
      };
    };

    {
      medicines = newMedicines;
      doctors = newDoctors;
      invoices = newInvoices;
      nextInvoiceNumber = old.nextInvoiceNumber;
      firmSettings = newFirmSettings;
    };
  };
};
