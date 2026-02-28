import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Set "mo:core/Set";



actor {
  type Medicine = {
    name : Text;
    openingStock : Int;
    sampling : Int;
    quantity : Int;
    batchNumber : Text;
    hsnCode : Text;
    expiryDate : Text;
    purchaseRate : Int;
    baseSellingRate : Int;
    mrp : Int;
  };

  type Doctor = {
    name : Text;
    shippingAddress : Text;
    customPrices : [(Text, Int)];
  };

  type InvoiceItem = {
    medicineName : Text;
    batchNumber : Text;
    hsnCode : Text;
    quantity : Int;
    sellingPrice : Int;
    amount : Int;
    expiryDate : Text;
    purchaseRate : Int;
    profit : Int;
  };

  type Invoice = {
    invoiceNumber : Nat;
    doctorName : Text;
    timestamp : Int;
    items : [InvoiceItem];
    subtotal : Int;
    gstAmount : Int;
    grandTotal : Int;
    totalProfit : Int;
    paymentType : Text;
    amountPaid : Int;
    amountDue : Int;
  };

  type FirmSettings = {
    name : Text;
    address : Text;
    gstin : Text;
    contact : Text;
    email : Text;
    defaultShippingAddress : Text;
    dilNumber : Text;
  };

  type PaymentRecord = {
    invoiceNumber : Nat;
    amount : Int;
    paymentDate : Text;
    timestamp : Int;
  };

  type LedgerSummary = {
    doctorName : Text;
    totalCredit : Int;
    totalPaid : Nat;
    outstandingBalance : Nat;
  };

  type BackupRecord = {
    timestamp : Int;
    version : Text;
    medicines : [Medicine];
    doctors : [Doctor];
    invoices : [Invoice];
    firmSettings : ?FirmSettings;
    paymentRecords : [(Nat, [PaymentRecord])];
  };

  type ProfitLossStats = {
    totalRevenue : Nat;
    totalCost : Nat;
    netProfit : Int;
    profitMargin : Int;
    invoiceCount : Nat;
  };

  let medicines = Map.empty<Text, Medicine>();
  let doctors = Map.empty<Text, Doctor>();
  let invoices = Map.empty<Nat, Invoice>();
  var nextInvoiceNumber = 1;
  var firmSettings : ?FirmSettings = null;
  var appPin : ?Text = null;

  // New field
  let paymentRecords = Map.empty<Nat, List.List<PaymentRecord>>();

  // Medicine Management
  public shared ({ caller }) func addOrUpdateMedicine(
    name : Text,
    openingStock : Int,
    sampling : Int,
    batchNumber : Text,
    hsnCode : Text,
    expiryDate : Text,
    purchaseRate : Int,
    baseSellingRate : Int,
    mrp : Int,
  ) : async () {
    validateFields(name, batchNumber, hsnCode, expiryDate);

    let medicine : Medicine = {
      name;
      openingStock;
      sampling;
      quantity = openingStock;
      batchNumber;
      hsnCode;
      expiryDate;
      purchaseRate;
      baseSellingRate;
      mrp;
    };
    medicines.add(name, medicine);
  };

  public shared ({ caller }) func deleteMedicine(name : Text) : async () {
    if (name.isEmpty()) {
      Runtime.trap("Empty names are not permitted");
    };
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

  public shared ({ caller }) func updateOpeningStock(name : Text, openingStock : Int) : async () {
    if (name.isEmpty()) {
      Runtime.trap("Empty names are not permitted");
    };

    switch (medicines.get(name)) {
      case (null) {
        Runtime.trap("Medicine not found");
      };
      case (?medicine) {
        let updatedMedicine : Medicine = {
          name = medicine.name;
          openingStock;
          sampling = medicine.sampling;
          quantity = openingStock;
          batchNumber = medicine.batchNumber;
          hsnCode = medicine.hsnCode;
          expiryDate = medicine.expiryDate;
          purchaseRate = medicine.purchaseRate;
          baseSellingRate = medicine.baseSellingRate;
          mrp = medicine.mrp;
        };
        medicines.add(name, updatedMedicine);
      };
    };
  };

  public shared ({ caller }) func updateSampling(name : Text, sampling : Int) : async () {
    if (name.isEmpty()) {
      Runtime.trap("Empty names are not permitted");
    };
    switch (medicines.get(name)) {
      case (null) {
        Runtime.trap("Medicine not found");
      };
      case (?medicine) {
        let updatedMedicine : Medicine = {
          name = medicine.name;
          openingStock = medicine.openingStock;
          sampling;
          quantity = medicine.openingStock - getTotalBilledQuantityInternal(name) - sampling;
          batchNumber = medicine.batchNumber;
          hsnCode = medicine.hsnCode;
          expiryDate = medicine.expiryDate;
          purchaseRate = medicine.purchaseRate;
          baseSellingRate = medicine.baseSellingRate;
          mrp = medicine.mrp;
        };
        medicines.add(name, updatedMedicine);
      };
    };
  };

  func getTotalBilledQuantityInternal(name : Text) : Int {
    invoices.values().foldLeft(
      0,
      func(acc, invoice) {
        acc + invoice.items.filter(func(item) { item.medicineName == name }).foldLeft(
          0,
          func(itemsAcc, item) { itemsAcc + item.quantity.toNat() },
        );
      },
    );
  };

  public query ({ caller }) func getTotalBilledQuantity(name : Text) : async Int {
    getTotalBilledQuantityInternal(name);
  };

  public shared ({ caller }) func reduceMedicineStock(name : Text, quantity : Int) : async () {
    switch (medicines.get(name)) {
      case (null) {
        Runtime.trap("Medicine not found");
      };
      case (?medicine) {
        let updatedMedicine : Medicine = {
          name = medicine.name;
          openingStock = medicine.openingStock;
          sampling = medicine.sampling;
          quantity = medicine.quantity - quantity;
          batchNumber = medicine.batchNumber;
          hsnCode = medicine.hsnCode;
          expiryDate = medicine.expiryDate;
          purchaseRate = medicine.purchaseRate;
          baseSellingRate = medicine.baseSellingRate;
          mrp = medicine.mrp;
        };
        medicines.add(name, updatedMedicine);
      };
    };
  };

  // Doctor Management
  public shared ({ caller }) func addDoctor(
    name : Text,
    shippingAddress : Text,
  ) : async () {
    if (name.isEmpty() or shippingAddress.isEmpty()) {
      switch (firmSettings) {
        case (null) {
          Runtime.trap("No default address defined");
        };
        case (?settings) {
          try {
            assert (not settings.defaultShippingAddress.isEmpty());
          } catch (e) {
            Runtime.trap("No default address defined");
          };
        };
      };
    };
    let doctor : Doctor = {
      name;
      shippingAddress;
      customPrices = [];
    };
    doctors.add(name, doctor);
  };

  public shared ({ caller }) func updateDoctor(
    name : Text,
    shippingAddress : Text,
  ) : async () {
    switch (doctors.get(name)) {
      case (null) {
        Runtime.trap("Doctor not found");
      };
      case (?_) {
        let updatedDoctor : Doctor = {
          name;
          shippingAddress;
          customPrices = [];
        };
        doctors.add(name, updatedDoctor);
      };
    };
  };

  public shared ({ caller }) func deleteDoctor(name : Text) : async () {
    if (not doctors.containsKey(name)) {
      Runtime.trap("Doctor not found");
    };
    doctors.remove(name);
  };

  public query ({ caller }) func getDoctor(name : Text) : async ?Doctor {
    doctors.get(name);
  };

  public query ({ caller }) func getAllDoctors() : async [Doctor] {
    let valuesIter = doctors.values();
    valuesIter.toArray();
  };

  // Doctor Custom Pricing Functions
  public shared ({ caller }) func setDoctorMedicinePrice(
    doctorName : Text,
    medicineName : Text,
    price : Int,
  ) : async () {
    switch (doctors.get(doctorName)) {
      case (null) {
        Runtime.trap("Doctor not found");
      };
      case (?doctor) {
        let filteredPrices = doctor.customPrices.filter(
          func((name, _)) { name != medicineName }
        );
        let updatedPrices = filteredPrices.concat([(medicineName, price)]);
        let updatedDoctor : Doctor = {
          name = doctor.name;
          shippingAddress = doctor.shippingAddress;
          customPrices = updatedPrices;
        };
        doctors.add(doctorName, updatedDoctor);
      };
    };
  };

  public query ({ caller }) func getDoctorMedicinePrice(doctorName : Text, medicineName : Text) : async Int {
    switch (doctors.get(doctorName)) {
      case (null) {
        Runtime.trap("Doctor not found");
      };
      case (?doctor) {
        switch (doctor.customPrices.find(func((name, _)) { name == medicineName })) {
          case (null) {
            switch (medicines.get(medicineName)) {
              case (null) {
                Runtime.trap("Medicine not found");
              };
              case (?medicine) {
                medicine.baseSellingRate;
              };
            };
          };
          case (?(_, price)) {
            price;
          };
        };
      };
    };
  };

  public query ({ caller }) func getAllDoctorPrices(
    doctorName : Text,
  ) : async [(Text, Int)] {
    switch (doctors.get(doctorName)) {
      case (null) {
        Runtime.trap("Doctor not found");
      };
      case (?doctor) {
        doctor.customPrices;
      };
    };
  };

  public shared ({ caller }) func removeDoctorMedicinePrice(
    doctorName : Text,
    medicineName : Text,
  ) : async () {
    switch (doctors.get(doctorName)) {
      case (null) {
        Runtime.trap("Doctor not found");
      };
      case (?doctor) {
        let filteredPrices = doctor.customPrices.filter(
          func((name, _)) { name != medicineName }
        );
        let updatedDoctor : Doctor = {
          name = doctor.name;
          shippingAddress = doctor.shippingAddress;
          customPrices = filteredPrices;
        };
        doctors.add(doctorName, updatedDoctor);
      };
    };
  };

  // Invoice Management
  public shared ({ caller }) func createInvoice(
    doctorName : Text,
    items : [(Text, Int)],
    paymentType : Text,
  ) : async Nat {
    func getDoctorMedicinePriceAsync(doctorName : Text, medicineName : Text) : Int {
      switch (doctors.get(doctorName)) {
        case (null) {
          Runtime.trap("Doctor not found");
        };
        case (?doctor) {
          switch (
            doctor.customPrices.find(func((name, _)) { name == medicineName })
          ) {
            case (null) {
              switch (medicines.get(medicineName)) {
                case (null) {
                  Runtime.trap("Medicine not found");
                };
                case (?medicine) {
                  medicine.baseSellingRate;
                };
              };
            };
            case (?(_, price)) {
              price;
            };
          };
        };
      };
    };

    switch (doctors.get(doctorName)) {
      case (null) {
        Runtime.trap("Doctor not found");
      };
      case (?_) {
        let invoiceItems = List.empty<InvoiceItem>();

        for ((medicineName, quantity) in items.values()) {
          let sellingRate = getDoctorMedicinePriceAsync(doctorName, medicineName);
          switch (medicines.get(medicineName)) {
            case (null) {
              Runtime.trap("Medicine not found: " # medicineName);
            };
            case (?medicine) {
              let baseAmount = sellingRate * quantity;
              let gstAmount = (baseAmount * 5) / 100;
              let invoiceItem : InvoiceItem = {
                medicineName = medicine.name;
                batchNumber = medicine.batchNumber;
                hsnCode = medicine.hsnCode;
                quantity;
                sellingPrice = sellingRate;
                amount = baseAmount;
                expiryDate = medicine.expiryDate;
                purchaseRate = medicine.purchaseRate;
                profit = sellingRate - medicine.purchaseRate;
              };
              invoiceItems.add(invoiceItem);
              await reduceMedicineStock(medicineName, quantity);
            };
          };
        };

        let subtotal = invoiceItems.foldLeft(
          Int.fromNat(0),
          func(acc, item) { acc + item.amount },
        );

        let gstAmount = (subtotal * 5) / 100;
        let grandTotal = subtotal + gstAmount;
        let totalProfit = invoiceItems.foldLeft(
          Int.fromNat(0),
          func(acc, item) { acc + item.profit },
        );
        let invoice : Invoice = {
          invoiceNumber = nextInvoiceNumber;
          doctorName;
          timestamp = Time.now();
          items = invoiceItems.toArray();
          subtotal;
          gstAmount;
          grandTotal;
          totalProfit;
          paymentType;
          amountPaid = if (paymentType == "cash") { grandTotal } else { 0 };
          amountDue = if (paymentType == "cash") { 0 } else { grandTotal };
        };
        invoices.add(nextInvoiceNumber, invoice);
        nextInvoiceNumber += 1;
        invoice.invoiceNumber;
      };
    };
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

  public type ProfitLossTimeFilter = { #daily; #weekly; #monthly; #all };

  public query ({ caller }) func getProfitLossStats(filter : ProfitLossTimeFilter) : async ProfitLossStats {
    let now = Time.now();
    let filteredInvoices = List.empty<Invoice>();

    for (invoice in invoices.values()) {
      switch (filter) {
        case (#daily) {
          if (now - invoice.timestamp <= 24 * 60 * 60 * 1000000000) {
            filteredInvoices.add(invoice);
          };
        };
        case (#weekly) {
          if (now - invoice.timestamp <= 7 * 24 * 60 * 60 * 1000000000) {
            filteredInvoices.add(invoice);
          };
        };
        case (#monthly) {
          if (now - invoice.timestamp <= 30 * 24 * 60 * 60 * 1000000000) {
            filteredInvoices.add(invoice);
          };
        };
        case (#all) { filteredInvoices.add(invoice) };
      };
    };

    let invoicesArray = filteredInvoices.toArray();

    let totalRevenue = invoicesArray.foldLeft(0, func(acc, invoice) {
      acc + Int.abs(invoice.grandTotal);
    });

    let totalCost = invoicesArray.foldLeft(0, func(acc, invoice) {
      let invoiceCost = invoice.items.foldLeft(0, func(itemAcc, item) {
        itemAcc + Int.abs(item.purchaseRate * item.quantity);
      });
      acc + invoiceCost;
    });

    let netProfit : Int = totalRevenue - totalCost;
    let profitMargin = if (totalRevenue > 0) {
      (netProfit * 100) / Int.abs(totalRevenue);
    } else { 0 };

    {
      totalRevenue = Int.abs(totalRevenue);
      totalCost = Int.abs(totalCost);
      netProfit;
      profitMargin;
      invoiceCount = invoicesArray.size();
    };
  };

  // Firm Settings
  public shared ({ caller }) func updateFirmSettings(
    name : Text,
    address : Text,
    gstin : Text,
    contact : Text,
    email : Text,
    defaultShippingAddress : Text,
    dilNumber : Text,
  ) : async () {
    let settings : FirmSettings = {
      name;
      address;
      gstin;
      contact;
      email;
      defaultShippingAddress;
      dilNumber;
    };
    firmSettings := ?settings;
  };

  public query ({ caller }) func getFirmSettings() : async FirmSettings {
    switch (firmSettings) {
      case (null) {
        Runtime.trap("Please Define a Firm");
      };
      case (?settings) { settings };
    };
  };

  // Data Backup
  public query ({ caller }) func backup() : async BackupRecord {
    {
      timestamp = Time.now();
      version = "2.0.0";
      medicines = medicines.values().toArray();
      doctors = doctors.values().toArray();
      invoices = invoices.values().toArray();
      firmSettings;
      paymentRecords = paymentRecords.toArray().map(
        func((key, paymentsList)) {
          (key, paymentsList.toArray());
        }
      );
    };
  };

  // Payment Management
  public shared ({ caller }) func recordPayment(
    invoiceNumber : Nat,
    amount : Int,
    paymentDate : Text,
  ) : async () {
    switch (invoices.get(invoiceNumber)) {
      case (null) {
        Runtime.trap("Invoice not found");
      };
      case (?invoice) {
        let paymentRecord : PaymentRecord = {
          invoiceNumber;
          amount;
          paymentDate;
          timestamp = Time.now();
        };

        switch (paymentRecords.get(invoiceNumber)) {
          case (null) {
            let paymentsList = List.empty<PaymentRecord>();
            paymentsList.add(paymentRecord);
            paymentRecords.add(invoiceNumber, paymentsList);
          };
          case (?paymentsList) {
            paymentsList.add(paymentRecord);
          };
        };

        let updatedInvoice : Invoice = {
          invoice with
          amountPaid = invoice.amountPaid + amount;
          amountDue = invoice.amountDue - amount;
        };
        invoices.add(invoiceNumber, updatedInvoice);
      };
    };
  };

  public query ({ caller }) func getInvoicePayments(invoiceNumber : Nat) : async [PaymentRecord] {
    switch (paymentRecords.get(invoiceNumber)) {
      case (null) { [] };
      case (?paymentsList) { paymentsList.toArray() };
    };
  };

  public query ({ caller }) func getDoctorLedgerSummary(doctorName : Text) : async LedgerSummary {
    var totalCredit : Nat = 0;
    var totalPaid : Nat = 0;

    for (invoice in invoices.values()) {
      if (invoice.doctorName == doctorName) {
        totalCredit += invoice.grandTotal.toNat();
        totalPaid += invoice.amountPaid.toNat();
      };
    };

    {
      doctorName;
      totalCredit = totalCredit.toInt();
      totalPaid;
      outstandingBalance = (totalCredit - totalPaid);
    };
  };

  func validateFields(
    name : Text,
    batchNumber : Text,
    hsnCode : Text,
    expiryDate : Text,
  ) {
    if (name.isEmpty() or batchNumber.isEmpty() or hsnCode.isEmpty() or expiryDate.isEmpty()) {
      Runtime.trap("Empty names are not permitted");
    };
  };

  public query ({ caller }) func getAppPin() : async ?Text {
    appPin;
  };

  public shared ({ caller }) func setAppPin(pin : Text) : async () {
    appPin := ?pin;
  };
};
