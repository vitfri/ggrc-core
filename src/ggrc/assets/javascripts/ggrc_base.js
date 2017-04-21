/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/
(function(GGRC) {
  GGRC.mustache_path = '/static/mustache';

  GGRC.hooks = GGRC.hooks || {};
  GGRC.extensions = GGRC.extensions || [];
  if (!GGRC.widget_descriptors) {
    GGRC.widget_descriptors = {};
  }
  if (!GGRC.default_widgets) {
    GGRC.default_widgets = [];
  }

  GGRC.register_hook = function(path, hook) {
    var h, parent_path, last;
    parent_path = path.split(".");
    last = parent_path.pop();
    parent_path = can.getObject(parent_path.join("."), GGRC.hooks, true);
    if (!(h = parent_path[last])) {
      h = new can.Observe.List();
      parent_path[last] = h;
    }
    h.push(hook);
  };

  var onbeforeunload = function (evnt) {
      evnt = evnt || window.event;
      var message = 'There are operations in progress. Are you sure you want to leave the page?';
      if (evnt) {
        evnt.returnValue = message;
      }
      return message;
    },
    notifier = new PersistentNotifier({
      while_queue_has_elements: function() {
        window.onbeforeunload = onbeforeunload;
      },
      when_queue_empties: function() {
        window.onbeforeunload = $.noop;
      },
      name: 'GGRC/window'
    });

  $.extend(GGRC, {
    get_object_type_decision_tree: function() {
      var tree = {},
        extensions = GGRC.extensions || []
      ;

      can.each(extensions, function(extension) {
        if (extension.object_type_decision_tree) {
          if (can.isFunction(extension.object_type_decision_tree)) {
            $.extend(tree, extension.object_type_decision_tree());
          } else {
            $.extend(tree, extension.object_type_decision_tree);
          }
        }
      });

      return tree;
    },

    infer_object_type: function(data) {
      var decision_tree = GGRC.get_object_type_decision_tree();

      function resolve_by_key(subtree, data) {
        var kind = data[subtree._key];
        var model;
        can.each(subtree, function(v, k) {
          if (k != "_key" && v.meta_kinds.indexOf(kind) >= 0) {
            model = v;
          }
        });
        return model;
      }

      function resolve(subtree, data) {
        if (typeof subtree === "undefined")
          return null;
        return can.isPlainObject(subtree) ?
          subtree._discriminator(data) :
          subtree;
      }

      if (!data) {
        return null;
      } else {
        return can.reduce(Object.keys(data), function (a, b) {
          return a || resolve(decision_tree[b], data[b]);
        }, null);
      }
    },
    make_model_instance: function(data) {
      if (!data) {
        return null;
      } else if (!!GGRC.page_model && GGRC.page_object === data) {
        return GGRC.page_model;
      } else {
        return GGRC.page_model = GGRC.infer_object_type(data).model($.extend({}, data));
      }
    },

    page_instance: function() {
      if (!GGRC._page_instance && GGRC.page_object) {
        GGRC._page_instance = GGRC.make_model_instance(GGRC.page_object);
      }
      return GGRC._page_instance;
    },

    eventqueue: [],
    eventqueueTimeout: null,
    eventqueueTimegap: 20, //ms

    queue_exec_next: function() {
      var fn = GGRC.eventqueue.shift();
      if (fn)
        fn();
      if (GGRC.eventqueue.length > 0)
        GGRC.eventqueueTimeout = setTimeout(GGRC.queue_exec_next, GGRC.eventqueueTimegap);
      else
        GGRC.eventqueueTimeout = null;
    },

    queue_event: function(events) {
      if (typeof (events) === "function")
        events = [events];
      GGRC.eventqueue.push.apply(GGRC.eventqueue, events);
      if (!GGRC.eventqueueTimeout)
        GGRC.eventqueueTimeout = setTimeout(GGRC.queue_exec_next, GGRC.eventqueueTimegap);
    },

    navigate: function(url) {
      function go() {
        if (!url) {
          window.location.reload();
        } else {
          window.location.assign(url);
        }
      }
      notifier.on_empty(go);
    },

    delay_leaving_page_until: $.proxy(notifier, "queue")
  });

  GGRC.Errors = (function () {
    var messages = {
      'default': 'There was an error!',
      '401': 'The server says you are not authorized. Are you logged in?',
      '403': 'You don\'t have the permission to access the ' +
      'requested resource. It is either read-protected or not ' +
      'readable by the server.',
      '409': 'There was a conflict while saving.' +
      ' Your changes have not yet been saved.' +
      ' Please refresh the page and try saving again',
      '412': 'One of the form fields isn\'t right. ' +
      'Check the form for any highlighted fields.'
    };

    function notifier(type, message) {
      var props = {};

      type = type || 'warning';
      props[type] = message || GGRC.Errors.messages.default;
      $('body').trigger('ajax:flash', props);
    }

    function notifierXHR(type, message) {
      return function (err) {
        var status = err && err.status ? err.status : null;

        if (status && !message) {
          message = GGRC.Errors.messages[status];
        }

        notifier(type, message);
      };
    }

    return {
      messages: messages,
      notifier: notifier,
      notifierXHR: notifierXHR
    };
  })();

  /*
    The GGRC Math library provides basic arithmetic across arbitrary precision numbers represented
    as strings.  We wrote this initially to handle easy re-sorting of items in tree views, since
    we could easily get hundreds of re-sorts by halving the distance from zero to MAX_SAFE_INT
    until we got down to 10^-250 which would overflow the string on the data side with zeroes.
  */
  GGRC.Math = GGRC.Math || {};
  $.extend(GGRC.Math, {
    /*
      @param a an addend represented as a decimal notation string
      @param b an addend represented as a decimal notation string

      @return the sum of the numbers represented in a and b, as a decimal notation string.
    */
    string_add: function(a, b) {
      var _a, _b, i,
        _c = 0,
        ret = [],
        adi = a.indexOf("."),
        bdi = b.indexOf(".");

      if (adi < 0) {
        a = a + ".";
        adi = a.length - 1;
      }
      if (bdi < 0) {
        b = b + ".";
        bdi = b.length - 1;
      }
      while (adi < bdi) {
        a = "0" + a;
        adi++;
      }
      while (bdi < adi) {
        b = "0" + b;
        bdi++;
      }

      for (i = Math.max(a.length, b.length) - 1; i >= 0; i--) {
        _a = a[i] || 0;
        _b = b[i] || 0;
        if (_a === "." || _b === ".") {
          if (_a !== "." || _b !== ".")
            throw "Decimal alignment error";
          ret.unshift(".");
        } else {
          ret.unshift((+_a) + (+_b) + _c);
          _c = Math.floor(ret[0] / 10);
          ret[0] = (ret[0] % 10).toString(10);
        }
      }
      if (_c > 0) {
        ret.unshift(_c.toString(10));
      }
      if (ret[ret.length - 1] === ".") {
        ret.pop();
      }
      return ret.join("");
    },

    /*
      @param a a decimal notation string

      @return one half of the number represented in a, as a decimal notation string.
    */
    string_half: function(a) {
      var i, _a,
        _c = 0,
        ret = [];

      if (!~a.indexOf(".")) {
        a = a + ".";
      }
      for (i = 0; i < a.length; i++) {
        _a = a[i];
        if (_a === ".") {
          ret.push(".");
        } else {
          _a = Math.floor((+_a + _c) / 2);
          if (+a[i] % 2) {
            _c = 10;
          } else {
            _c = 0;
          }
          ret.push(_a.toString(10));
        }
      }
      if (_c > 0) {
        ret.push("5");
      }
      if (ret[ret.length - 1] === ".") {
        ret.pop();
      }
      while (ret[0] === "0" && ret.length > 1) {
        ret.shift();
      }
      return ret.join("");
    },

    /*
      @param a a number represented as a decimal notation string
      @param b a number represented as a decimal notation string

      @return the maximum of the numbers represented in a and b, as a decimal notation string.
    */
    string_max: function(a, b) {
      return this.string_less_than(a, b) ? b : a;
    },

    /*
      @param a a number represented as a decimal notation string
      @param b a number represented as a decimal notation string

      @return true if the number represented in a is less than that in b, false otherwise
    */
    string_less_than: function(a, b) {
      var i,
        _a = ("" + a).replace(/^0*/, ""),
        _b = ("" + b).replace(/^0*/, ""),
        adi = _a.indexOf("."),
        bdi = _b.indexOf(".");

      if (adi < 0) {
        _a = _a + ".";
        adi = _a.length - 1;
      }
      if (bdi < 0) {
        _b = _b + ".";
        bdi = _b.length - 1;
      }
      if (adi < bdi) {
        return true;
      }
      if (bdi < adi) {
        return false;
      }
      for (i = 0; i < _a.length - 1; i++) {
        if (_a[i] === ".") {
        // continue
        } else {
          if ((+_a[i] || 0) < (+_b[i] || 0)) {
            return true;
          } else if ((+_a[i] || 0) > (+_b[i] || 0)) {
            return false;
          }
        }
      }
      return _b.length >= _a.length ? false : true;
    }

  });
})(window.GGRC = window.GGRC || {});
