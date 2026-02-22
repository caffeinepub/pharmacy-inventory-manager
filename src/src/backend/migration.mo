module {
  type OldFirmSettings = {
    name : Text;
    address : Text;
    gstin : Text;
    contact : Text;
    email : Text;
    shippingAddress : Text;
  };

  type OldActor = {
    firmSettings : ?OldFirmSettings;
  };

  type NewFirmSettings = {
    name : Text;
    address : Text;
    gstin : Text;
    contact : Text;
    email : Text;
    shippingAddress : Text;
    dilNumber : Text;
  };

  type NewActor = {
    firmSettings : ?NewFirmSettings;
  };

  public func run(old : OldActor) : NewActor {
    let newFirmSettings = switch (old.firmSettings) {
      case (null) { null };
      case (?settings) {
        ?{ settings with dilNumber = "" };
      };
    };
    { old with firmSettings = newFirmSettings };
  };
};
