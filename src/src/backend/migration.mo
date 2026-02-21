import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";

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

  type OldDoctor = {
    name : Text;
    marginPercentage : Int;
  };

  type OldInvoiceItem = {
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

  type OldInvoice = {
    invoiceNumber : Nat;
    doctorName : Text;
    items : [OldInvoiceItem];
    totalAmount : Int;
    totalSgst : Int;
    totalCgst : Int;
    grandTotal : Int;
  };

  type OldFirmSettings = {
    name : Text;
    address : Text;
    gstin : Text;
    contact : Text;
    email : Text;
    shippingAddress : Text;
  };

  type OldActor = {
    medicines : Map.Map<Text, OldMedicine>;
    doctors : Map.Map<Text, OldDoctor>;
    invoices : Map.Map<Nat, OldInvoice>;
    nextInvoiceNumber : Nat;
    firmSettings : ?OldFirmSettings;
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

  type NewFirmSettings = {
    name : Text;
    address : Text;
    gstin : Text;
    contact : Text;
    email : Text;
    shippingAddress : Text;
  };

  type NewActor = {
    medicines : Map.Map<Text, OldMedicine>;
    doctors : Map.Map<Text, OldDoctor>;
    invoices : Map.Map<Nat, NewInvoice>;
    nextInvoiceNumber : Nat;
    firmSettings : ?NewFirmSettings;
  };

  public func run(old : OldActor) : NewActor {
    let newInvoices = old.invoices.map<Nat, OldInvoice, NewInvoice>(
      func(_invoiceNumber, oldInvoice) {
        let newItems = oldInvoice.items.map(
          func(oldItem) {
            {
              oldItem with
              expiryDate = "N/A";
            };
          }
        );
        { oldInvoice with items = newItems };
      }
    );
    {
      old with
      invoices = newInvoices;
    };
  };
};
