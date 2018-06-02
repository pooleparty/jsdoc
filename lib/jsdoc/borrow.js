/**
 * A collection of functions relating to resolving @borrows tags in JSDoc symbols.
 * @module jsdoc/borrow
 */

import cloneDeep from 'lodash/cloneDeep';
import { SCOPE } from './name';

function cloneBorrowedDoclets(doclet, doclets) {
  doclet.borrowed.forEach((borrowed) => {
    var borrowedDoclets = doclets.index.longname[borrowed.from];
    var borrowedAs = borrowed.as || borrowed.from;
    var parts;
    var scopePunc;

    if (borrowedDoclets) {
      borrowedAs = borrowedAs.replace(/^prototype\./, SCOPE.PUNC.INSTANCE);
      cloneDeep(borrowedDoclets).forEach((clone) => {
        // TODO: this will fail on longnames like '"Foo#bar".baz'
        parts = borrowedAs.split(SCOPE.PUNC.INSTANCE);

        if (parts.length === 2) {
          clone.scope = SCOPE.NAMES.INSTANCE;
          scopePunc = SCOPE.PUNC.INSTANCE;
        } else {
          clone.scope = SCOPE.NAMES.STATIC;
          scopePunc = SCOPE.PUNC.STATIC;
        }

        clone.name = parts.pop();
        clone.memberof = doclet.longname;
        clone.longname = clone.memberof + scopePunc + clone.name;
        doclets.push(clone);
      });
    }
  });
}

/**
    Take a copy of the docs for borrowed symbols and attach them to the
    docs for the borrowing symbol. This process changes the symbols involved,
    moving docs from the "borrowed" array and into the general docs, then
    deleting the "borrowed" array.
 */
export function resolveBorrows(doclets) {
  var doclet;

  for (var i = 0, l = doclets.index.borrowed.length; i < l; i++) {
    doclet = doclets.index.borrowed[i];

    cloneBorrowedDoclets(doclet, doclets);
    delete doclet.borrowed;
  }

  doclets.index.borrowed = [];
}
