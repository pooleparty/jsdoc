const hasOwnProp = Object.prototype.hasOwnProperty;

export default class DocletCache {
  constructor() {
    this.doclets = {};
  }

  get = (name) => {
    if (!hasOwnProp.call(this.doclets, name)) {
      return null;
    }

    // always return the most recent doclet
    return this.doclets[name][this.doclets[name].length - 1];
  };

  put = (name, value) => {
    if (!hasOwnProp.call(this.doclets, name)) {
      this.doclets[name] = [];
    }

    this.doclets[name].push(value);
  };
}
