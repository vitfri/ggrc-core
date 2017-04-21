/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

describe('GGRC.Component.CommentInput', function () {
  'use strict';

  var testingText = 'Lorem ipsum ' +
    'dolor sit amet, consectetur adipiscing elit.' +
    ' Mauris accumsan porta nisl ut lobortis.' +
    ' Proin sollicitudin enim ante,' +
    ' sit amet elementum ipsum fringilla sed';

  describe('.setValues() method', function () {
    var scope;

    beforeEach(function () {
      scope = GGRC.Components.getViewModel('commentInput');
    });

    it('should update: value and isEmpty. length is > 0 ', function () {
      scope.attr('value', testingText);

      expect(scope.attr('value')).toBe(testingText);
      expect(scope.attr('isEmpty')).toBe(false);
    });
    it('should update: value and isEmpty. length is equal 0 ', function () {
      scope.attr('value', null);

      expect(scope.attr('value')).toBe('');
      expect(scope.attr('isEmpty')).toBe(true);
    });
    it('should update multiple times: value and isEmpty.', function () {
      scope.attr('value', null);

      expect(scope.attr('value')).toBe('');
      expect(scope.attr('isEmpty')).toBe(true);

      scope.attr('value', testingText);

      expect(scope.attr('value')).toBe(testingText);
      expect(scope.attr('isEmpty')).toBe(false);

      scope.attr('value', null);

      expect(scope.attr('value')).toBe('');
      expect(scope.attr('isEmpty')).toBe(true);
    });
  });
});
