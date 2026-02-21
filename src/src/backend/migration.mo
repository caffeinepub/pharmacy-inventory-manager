import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

module {
  type OldMedicine = {
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
    expiryDate : Text;
  };

  type OldInvoice = {
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

  type OldActor = {
    medicines : Map.Map<Text, OldMedicine>;
    doctors : Map.Map<Text, Doctor>;
    invoices : Map.Map<Nat, OldInvoice>;
    nextInvoiceNumber : Nat;
    firmSettings : ?FirmSettings;
  };

  type NewMedicine = {
    name : Text;
    quantity : Int;
    batchNumber : Text;
    hsnCode : Text;
    expiryDate : Text;
    purchaseRate : Int;
    sellingRate : Int;
    mrp : Int;
  };

  type NewInvoiceItem = {
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

  type NewInvoice = {
    invoiceNumber : Nat;
    doctorName : Text;
    items : [NewInvoiceItem];
    totalAmount : Int;
    totalSgst : Int;
    totalCgst : Int;
    grandTotal : Int;
  };

  type NewActor = {
    medicines : Map.Map<Text, NewMedicine>;
    doctors : Map.Map<Text, Doctor>;
    invoices : Map.Map<Nat, NewInvoice>;
    nextInvoiceNumber : Nat;
    firmSettings : ?FirmSettings;
  };

  public func run(old : OldActor) : NewActor {
    let newMedicines = old.medicines.map<Text, OldMedicine, NewMedicine>(
      func(_name, oldMedicine) {
        { oldMedicine with quantity = Int.fromNat(oldMedicine.quantity) };
      }
    );

    let newInvoices = old.invoices.map<Nat, OldInvoice, NewInvoice>(
      func(_invoiceNumber, oldInvoice) {
        let newItems = oldInvoice.items.map(
          func(oldItem) {
            { oldItem with quantity = Int.fromNat(oldItem.quantity) };
          }
        );
        { oldInvoice with items = newItems };
      }
    );

    {
      medicines = newMedicines;
      doctors = old.doctors;
      invoices = newInvoices;
      nextInvoiceNumber = old.nextInvoiceNumber;
      firmSettings = old.firmSettings;
    };
  };
};
