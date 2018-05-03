/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _jsreportStudio = __webpack_require__(1);
	
	var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);
	
	var _react = __webpack_require__(2);
	
	var _react2 = _interopRequireDefault(_react);
	
	var _HistoryEditor = __webpack_require__(3);
	
	var _HistoryEditor2 = _interopRequireDefault(_HistoryEditor);
	
	var _LocalChangesEditor = __webpack_require__(9);
	
	var _LocalChangesEditor2 = _interopRequireDefault(_LocalChangesEditor);
	
	var _VersionControl = __webpack_require__(5);
	
	var _VersionControl2 = _interopRequireDefault(_VersionControl);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }
	
	_jsreportStudio2.default.initializeListeners.push(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
	  var VCToolbar;
	  return regeneratorRuntime.wrap(function _callee$(_context) {
	    while (1) {
	      switch (_context.prev = _context.next) {
	        case 0:
	          if (!(_jsreportStudio2.default.authentication && !_jsreportStudio2.default.authentication.user.isAdmin)) {
	            _context.next = 2;
	            break;
	          }
	
	          return _context.abrupt('return');
	
	        case 2:
	
	          _jsreportStudio2.default.addEditorComponent('versionControlHistory', _HistoryEditor2.default);
	          _jsreportStudio2.default.addEditorComponent('versionControlLocalChanges', _LocalChangesEditor2.default);
	
	          VCToolbar = function (_Component) {
	            _inherits(VCToolbar, _Component);
	
	            function VCToolbar() {
	              _classCallCheck(this, VCToolbar);
	
	              var _this = _possibleConstructorReturn(this, (VCToolbar.__proto__ || Object.getPrototypeOf(VCToolbar)).call(this));
	
	              _this.state = {};
	              _this.tryHide = _this.tryHide.bind(_this);
	              return _this;
	            }
	
	            _createClass(VCToolbar, [{
	              key: 'componentDidMount',
	              value: function componentDidMount() {
	                window.addEventListener('click', this.tryHide);
	              }
	            }, {
	              key: 'componentWillUnmount',
	              value: function componentWillUnmount() {
	                window.removeEventListener('click', this.tryHide);
	              }
	            }, {
	              key: 'tryHide',
	              value: function tryHide() {
	                this.setState({ expandedToolbar: false });
	              }
	            }, {
	              key: 'openHistory',
	              value: function openHistory(e) {
	                e.stopPropagation();
	                this.tryHide();
	                _jsreportStudio2.default.openTab({ key: 'versionControlHistory', editorComponentKey: 'versionControlHistory', title: 'Commits history' });
	              }
	            }, {
	              key: 'openLocalChanges',
	              value: function openLocalChanges(e) {
	                e.stopPropagation();
	                this.tryHide();
	                _jsreportStudio2.default.openTab({ key: 'versionControlLocalChanges', editorComponentKey: 'versionControlLocalChanges', title: 'Uncommited changes' });
	              }
	            }, {
	              key: 'render',
	              value: function render() {
	                var _this2 = this;
	
	                return _react2.default.createElement(
	                  'div',
	                  { className: 'toolbar-button', onClick: function onClick(e) {
	                      return _this2.openLocalChanges(e);
	                    } },
	                  _react2.default.createElement('i', { className: 'fa fa-history ' }),
	                  'Commit',
	                  _react2.default.createElement('span', { className: _VersionControl2.default.runCaret, onClick: function onClick(e) {
	                      e.stopPropagation();_this2.setState({ expandedToolbar: !_this2.state.expandedToolbar });
	                    } }),
	                  _react2.default.createElement(
	                    'div',
	                    { className: _VersionControl2.default.runPopup, style: { display: this.state.expandedToolbar ? 'block' : 'none' } },
	                    _react2.default.createElement(
	                      'div',
	                      { title: 'History', className: 'toolbar-button', onClick: function onClick(e) {
	                          return _this2.openHistory(e);
	                        } },
	                      _react2.default.createElement('i', { className: 'fa fa-history' }),
	                      _react2.default.createElement(
	                        'span',
	                        null,
	                        'History'
	                      )
	                    )
	                  )
	                );
	              }
	            }]);
	
	            return VCToolbar;
	          }(_react.Component);
	
	          _jsreportStudio2.default.addToolbarComponent(function (props) {
	            return _react2.default.createElement(VCToolbar, null);
	          });
	
	        case 6:
	        case 'end':
	          return _context.stop();
	      }
	    }
	  }, _callee, undefined);
	})));

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = Studio;

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = Studio.libraries['react'];

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _react = __webpack_require__(2);
	
	var _react2 = _interopRequireDefault(_react);
	
	var _jsreportStudio = __webpack_require__(1);
	
	var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);
	
	var _ChangesTable = __webpack_require__(4);
	
	var _ChangesTable2 = _interopRequireDefault(_ChangesTable);
	
	var _VersionControl = __webpack_require__(5);
	
	var _VersionControl2 = _interopRequireDefault(_VersionControl);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var HistoryEditor = function (_Component) {
	  _inherits(HistoryEditor, _Component);
	
	  function HistoryEditor() {
	    _classCallCheck(this, HistoryEditor);
	
	    var _this = _possibleConstructorReturn(this, (HistoryEditor.__proto__ || Object.getPrototypeOf(HistoryEditor)).call(this));
	
	    _this.state = { history: [] };
	    return _this;
	  }
	
	  _createClass(HistoryEditor, [{
	    key: 'componentDidMount',
	    value: function componentDidMount() {
	      this.load();
	    }
	  }, {
	    key: 'load',
	    value: function () {
	      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
	        var res;
	        return regeneratorRuntime.wrap(function _callee$(_context) {
	          while (1) {
	            switch (_context.prev = _context.next) {
	              case 0:
	                _context.prev = 0;
	                _context.next = 3;
	                return _jsreportStudio2.default.api.get('/api/version-control/history');
	
	              case 3:
	                res = _context.sent;
	
	                this.setState({ history: res });
	                _context.next = 10;
	                break;
	
	              case 7:
	                _context.prev = 7;
	                _context.t0 = _context['catch'](0);
	
	                alert(_context.t0);
	
	              case 10:
	              case 'end':
	                return _context.stop();
	            }
	          }
	        }, _callee, this, [[0, 7]]);
	      }));
	
	      function load() {
	        return _ref.apply(this, arguments);
	      }
	
	      return load;
	    }()
	  }, {
	    key: 'checkout',
	    value: function () {
	      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(id) {
	        var localChanges;
	        return regeneratorRuntime.wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                _context2.prev = 0;
	                _context2.next = 3;
	                return _jsreportStudio2.default.api.get('/api/version-control/local-changes');
	
	              case 3:
	                localChanges = _context2.sent;
	
	                if (!(localChanges.length > 0)) {
	                  _context2.next = 6;
	                  break;
	                }
	
	                return _context2.abrupt('return', this.setState({ error: 'You have uncommited changes. You need to commit or revert them before checkout.' }));
	
	              case 6:
	                if (!confirm('This will change the state of all entities to the state stored with selected commit. Are you sure?')) {
	                  _context2.next = 10;
	                  break;
	                }
	
	                _context2.next = 9;
	                return _jsreportStudio2.default.api.post('/api/version-control/checkout', {
	                  data: {
	                    _id: id
	                  }
	                });
	
	              case 9:
	                // studio needs a method to reload entities, it would be also usefull for export import
	                location.reload();
	
	              case 10:
	                _context2.next = 15;
	                break;
	
	              case 12:
	                _context2.prev = 12;
	                _context2.t0 = _context2['catch'](0);
	
	                alert(_context2.t0);
	
	              case 15:
	              case 'end':
	                return _context2.stop();
	            }
	          }
	        }, _callee2, this, [[0, 12]]);
	      }));
	
	      function checkout(_x) {
	        return _ref2.apply(this, arguments);
	      }
	
	      return checkout;
	    }()
	  }, {
	    key: 'selectCommit',
	    value: function () {
	      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(c) {
	        var res;
	        return regeneratorRuntime.wrap(function _callee3$(_context3) {
	          while (1) {
	            switch (_context3.prev = _context3.next) {
	              case 0:
	                this.setState({ commit: c });
	
	                _context3.prev = 1;
	                _context3.next = 4;
	                return _jsreportStudio2.default.api.get('/api/version-control/diff/' + c._id);
	
	              case 4:
	                res = _context3.sent;
	
	                this.setState({ diff: res });
	                _context3.next = 11;
	                break;
	
	              case 8:
	                _context3.prev = 8;
	                _context3.t0 = _context3['catch'](1);
	
	                alert(_context3.t0);
	
	              case 11:
	              case 'end':
	                return _context3.stop();
	            }
	          }
	        }, _callee3, this, [[1, 8]]);
	      }));
	
	      function selectCommit(_x2) {
	        return _ref3.apply(this, arguments);
	      }
	
	      return selectCommit;
	    }()
	  }, {
	    key: 'renderCommit',
	    value: function renderCommit(commit) {
	      var _this2 = this;
	
	      return _react2.default.createElement(
	        'div',
	        null,
	        _react2.default.createElement(
	          'h2',
	          null,
	          _react2.default.createElement('i', { className: 'fa fa-info-circle' }),
	          ' ',
	          commit.message
	        ),
	        _react2.default.createElement(
	          'div',
	          null,
	          _react2.default.createElement(
	            'small',
	            null,
	            commit.date.toLocaleString()
	          ),
	          _react2.default.createElement(
	            'button',
	            { className: 'button danger', onClick: function onClick() {
	                return _this2.checkout(commit._id);
	              } },
	            'Checkout'
	          ),
	          _react2.default.createElement(
	            'span',
	            { style: { color: 'red', marginTop: '0.5rem', display: this.state.error ? 'block' : 'none' } },
	            this.state.error
	          )
	        )
	      );
	    }
	  }, {
	    key: 'localChanges',
	    value: function localChanges() {
	      _jsreportStudio2.default.openTab({ key: 'versionControlLocalChanges', editorComponentKey: 'versionControlLocalChanges', title: 'Uncommited changes' });
	    }
	  }, {
	    key: 'render',
	    value: function render() {
	      var _this3 = this;
	
	      return _react2.default.createElement(
	        'div',
	        { className: 'block custom-editor' },
	        _react2.default.createElement(
	          'h2',
	          null,
	          _react2.default.createElement('i', { className: 'fa fa-history' }),
	          ' Commits history',
	          _react2.default.createElement(
	            'button',
	            { className: 'button confirmation', onClick: function onClick() {
	                return _this3.load();
	              } },
	            'Refresh'
	          ),
	          _react2.default.createElement(
	            'button',
	            { className: 'button confirmation', onClick: function onClick() {
	                return _this3.localChanges();
	              } },
	            'Uncommited changes'
	          )
	        ),
	        _react2.default.createElement(
	          'div',
	          { style: { marginTop: '1rem', marginBottom: '1rem' } },
	          this.state.history.length > 0 ? 'Select a commit from the list to inspect the changes..' : ''
	        ),
	        _react2.default.createElement(
	          'div',
	          { className: _VersionControl2.default.listContainer + ' block-item' },
	          _react2.default.createElement(
	            'table',
	            { className: 'table' },
	            _react2.default.createElement(
	              'thead',
	              null,
	              _react2.default.createElement(
	                'tr',
	                null,
	                _react2.default.createElement(
	                  'th',
	                  null,
	                  'date'
	                ),
	                _react2.default.createElement(
	                  'th',
	                  null,
	                  'message'
	                )
	              )
	            ),
	            _react2.default.createElement(
	              'tbody',
	              null,
	              this.state.history.map(function (h) {
	                return _react2.default.createElement(
	                  'tr',
	                  { key: h._id, onClick: function onClick() {
	                      return _this3.selectCommit(h);
	                    } },
	                  _react2.default.createElement(
	                    'td',
	                    null,
	                    h.date.toLocaleString()
	                  ),
	                  _react2.default.createElement(
	                    'td',
	                    null,
	                    h.message
	                  )
	                );
	              })
	            )
	          )
	        ),
	        _react2.default.createElement(
	          'div',
	          { style: { marginTop: '1rem', marginBottom: '1rem' } },
	          this.state.commit ? this.renderCommit(this.state.commit) : null
	        ),
	        _react2.default.createElement(
	          'div',
	          { className: _VersionControl2.default.listContainer + ' block-item' },
	          this.state.diff ? _react2.default.createElement(_ChangesTable2.default, { changes: this.state.diff }) : ''
	        )
	      );
	    }
	  }]);
	
	  return HistoryEditor;
	}(_react.Component);
	
	exports.default = HistoryEditor;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _jsreportStudio = __webpack_require__(1);
	
	var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }
	
	var openDiff = function () {
	  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(patch) {
	    var res;
	    return regeneratorRuntime.wrap(function _callee$(_context) {
	      while (1) {
	        switch (_context.prev = _context.next) {
	          case 0:
	            _context.next = 2;
	            return _jsreportStudio2.default.api.post('/api/version-control/diff-html', {
	              data: {
	                patch: patch
	              },
	              parseJSON: false
	            });
	
	          case 2:
	            res = _context.sent;
	
	            _jsreportStudio2.default.setPreviewFrameSrc('data:text/html;charset=utf-8,' + encodeURIComponent(res));
	
	          case 4:
	          case 'end':
	            return _context.stop();
	        }
	      }
	    }, _callee, undefined);
	  }));
	
	  return function openDiff(_x) {
	    return _ref.apply(this, arguments);
	  };
	}();
	
	var operationIcon = function operationIcon(operation) {
	  switch (operation) {
	    case 'insert':
	      return 'fa fa-plus';
	    case 'remove':
	      return 'fa fa-eraser';
	    case 'update':
	      return 'fa fa-pencil';
	  }
	};
	
	var renderChange = function renderChange(c) {
	  return React.createElement(
	    'tbody',
	    { key: c.entitySet + c.path },
	    React.createElement(
	      'tr',
	      { onClick: function onClick() {
	          return openDiff(c.patch);
	        } },
	      React.createElement(
	        'td',
	        { style: { textAlign: 'center' } },
	        React.createElement('i', { className: operationIcon(c.operation) })
	      ),
	      React.createElement(
	        'td',
	        null,
	        c.path
	      ),
	      React.createElement(
	        'td',
	        null,
	        c.entitySet
	      )
	    )
	  );
	};
	
	exports.default = function (_ref2) {
	  var changes = _ref2.changes;
	  return React.createElement(
	    'table',
	    { className: 'table' },
	    React.createElement(
	      'thead',
	      null,
	      React.createElement(
	        'tr',
	        null,
	        React.createElement(
	          'th',
	          { style: { width: '20px' } },
	          'operation'
	        ),
	        React.createElement(
	          'th',
	          null,
	          'path'
	        ),
	        React.createElement(
	          'th',
	          null,
	          'entity set'
	        )
	      )
	    ),
	    changes.map(function (c) {
	      return renderChange(c);
	    })
	  );
	};

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag
	
	// load the styles
	var content = __webpack_require__(6);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(8)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!./../node_modules/css-loader/index.js?modules&importLoaders=2&sourceMap&localIdentName=[local]___[hash:base64:5]!./../node_modules/postcss-loader/index.js!./../node_modules/sass-loader/index.js?outputStyle=expanded&sourceMap!./VersionControl.scss", function() {
				var newContent = require("!!./../node_modules/css-loader/index.js?modules&importLoaders=2&sourceMap&localIdentName=[local]___[hash:base64:5]!./../node_modules/postcss-loader/index.js!./../node_modules/sass-loader/index.js?outputStyle=expanded&sourceMap!./VersionControl.scss");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(7)();
	// imports
	
	
	// module
	exports.push([module.id, ".popup___3FgvU {\n  background-color: #424c57;\n  position: absolute;\n  right: 0;\n  padding: 0.5rem;\n  top: 2.4rem;\n  z-index: 200;\n}\n\n.popup___3FgvU > div {\n  padding: 0.5rem;\n}\n\n.popup___3FgvU > div:hover {\n  background-color: red;\n}\n\n.runCaret___2HCZa {\n  font-family: FontAwesome;\n  padding: 0.5rem;\n  font-size: 0.7rem;\n}\n\n.runCaret___2HCZa:hover {\n  color: blue;\n}\n\n.runCaret___2HCZa:after {\n  content: \"\\F0D7   \";\n}\n\n.runPopup___1Zk47 {\n  background-color: #424c57;\n  top: 2.4rem;\n  position: absolute;\n  padding: 0.5rem;\n  z-index: 200;\n}\n\n.listContainer___2itcv {\n  overflow: auto;\n  position: relative;\n  padding: 1rem;\n  min-height: 0;\n  height: auto;\n}\n\n.listContainer___2itcv > table {\n  width: 95%;\n  position: absolute !important;\n}\n", "", {"version":3,"sources":["/./studio/studio/VersionControl.scss"],"names":[],"mappings":"AAAA;EACI,0BAAyB;EACzB,mBAAkB;EAClB,SAAQ;EACR,gBAAe;EACf,YAAW;EACX,aACF;CAAE;;AAEF;EACE,gBAAe;CAChB;;AAED;EACE,sBAAqB;CACtB;;AAED;EACE,yBAAwB;EACxB,gBAAe;EACf,kBAAiB;CAClB;;AAED;EACE,YAAW;CACZ;;AAED;EACE,oBACF;CAAE;;AAEF;EACE,0BAAyB;EACzB,YAAW;EACX,mBAAkB;EAClB,gBAAe;EACf,aAAY;CACb;;AAED;EACE,eAAc;EACd,mBAAkB;EAClB,cAAa;EACb,cAAa;EACb,aAAY;CACb;;AAED;EAEE,WAAU;EAEV,8BAA6B;CAC9B","file":"VersionControl.scss","sourcesContent":[".popup {\n    background-color: #424c57;\n    position: absolute;\n    right: 0;\n    padding: 0.5rem;\n    top: 2.4rem;\n    z-index: 200\n  }\n  \n  .popup > div  {\n    padding: 0.5rem;\n  }\n  \n  .popup > div:hover {\n    background-color: red;\n  }\n  \n  .runCaret {\n    font-family: FontAwesome;\n    padding: 0.5rem;\n    font-size: 0.7rem;\n  }\n  \n  .runCaret:hover {\n    color: blue;\n  }\n  \n  .runCaret:after {\n    content: \"\\f0d7 \"\n  }\n  \n  .runPopup {\n    background-color: #424c57;\n    top: 2.4rem;\n    position: absolute;\n    padding: 0.5rem;\n    z-index: 200;\n  }\n  \n  .listContainer {   \n    overflow: auto;\n    position: relative;\n    padding: 1rem;\n    min-height: 0;\n    height: auto;\n  }\n  \n  .listContainer > table {\n    // it somehow shows the horizontal scrollbar even when no needeit, this workaround to hide it\n    width: 95%;\n    // the tabs height based on flex box is otherwise wrongly calculated\n    position: absolute !important;\n  }"],"sourceRoot":"webpack://"}]);
	
	// exports
	exports.locals = {
		"popup": "popup___3FgvU",
		"runCaret": "runCaret___2HCZa",
		"runPopup": "runPopup___1Zk47",
		"listContainer": "listContainer___2itcv"
	};

/***/ },
/* 7 */
/***/ function(module, exports) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	// css base code, injected by the css-loader
	module.exports = function() {
		var list = [];
	
		// return the list of modules as css string
		list.toString = function toString() {
			var result = [];
			for(var i = 0; i < this.length; i++) {
				var item = this[i];
				if(item[2]) {
					result.push("@media " + item[2] + "{" + item[1] + "}");
				} else {
					result.push(item[1]);
				}
			}
			return result.join("");
		};
	
		// import a list of modules into the list
		list.i = function(modules, mediaQuery) {
			if(typeof modules === "string")
				modules = [[null, modules, ""]];
			var alreadyImportedModules = {};
			for(var i = 0; i < this.length; i++) {
				var id = this[i][0];
				if(typeof id === "number")
					alreadyImportedModules[id] = true;
			}
			for(i = 0; i < modules.length; i++) {
				var item = modules[i];
				// skip already imported module
				// this implementation is not 100% perfect for weird media query combinations
				//  when a module is imported multiple times with different media queries.
				//  I hope this will never occur (Hey this way we have smaller bundles)
				if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
					if(mediaQuery && !item[2]) {
						item[2] = mediaQuery;
					} else if(mediaQuery) {
						item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
					}
					list.push(item);
				}
			}
		};
		return list;
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	var stylesInDom = {},
		memoize = function(fn) {
			var memo;
			return function () {
				if (typeof memo === "undefined") memo = fn.apply(this, arguments);
				return memo;
			};
		},
		isOldIE = memoize(function() {
			return /msie [6-9]\b/.test(window.navigator.userAgent.toLowerCase());
		}),
		getHeadElement = memoize(function () {
			return document.head || document.getElementsByTagName("head")[0];
		}),
		singletonElement = null,
		singletonCounter = 0,
		styleElementsInsertedAtTop = [];
	
	module.exports = function(list, options) {
		if(false) {
			if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
		}
	
		options = options || {};
		// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
		// tags it will allow on a page
		if (typeof options.singleton === "undefined") options.singleton = isOldIE();
	
		// By default, add <style> tags to the bottom of <head>.
		if (typeof options.insertAt === "undefined") options.insertAt = "bottom";
	
		var styles = listToStyles(list);
		addStylesToDom(styles, options);
	
		return function update(newList) {
			var mayRemove = [];
			for(var i = 0; i < styles.length; i++) {
				var item = styles[i];
				var domStyle = stylesInDom[item.id];
				domStyle.refs--;
				mayRemove.push(domStyle);
			}
			if(newList) {
				var newStyles = listToStyles(newList);
				addStylesToDom(newStyles, options);
			}
			for(var i = 0; i < mayRemove.length; i++) {
				var domStyle = mayRemove[i];
				if(domStyle.refs === 0) {
					for(var j = 0; j < domStyle.parts.length; j++)
						domStyle.parts[j]();
					delete stylesInDom[domStyle.id];
				}
			}
		};
	}
	
	function addStylesToDom(styles, options) {
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			if(domStyle) {
				domStyle.refs++;
				for(var j = 0; j < domStyle.parts.length; j++) {
					domStyle.parts[j](item.parts[j]);
				}
				for(; j < item.parts.length; j++) {
					domStyle.parts.push(addStyle(item.parts[j], options));
				}
			} else {
				var parts = [];
				for(var j = 0; j < item.parts.length; j++) {
					parts.push(addStyle(item.parts[j], options));
				}
				stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
			}
		}
	}
	
	function listToStyles(list) {
		var styles = [];
		var newStyles = {};
		for(var i = 0; i < list.length; i++) {
			var item = list[i];
			var id = item[0];
			var css = item[1];
			var media = item[2];
			var sourceMap = item[3];
			var part = {css: css, media: media, sourceMap: sourceMap};
			if(!newStyles[id])
				styles.push(newStyles[id] = {id: id, parts: [part]});
			else
				newStyles[id].parts.push(part);
		}
		return styles;
	}
	
	function insertStyleElement(options, styleElement) {
		var head = getHeadElement();
		var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
		if (options.insertAt === "top") {
			if(!lastStyleElementInsertedAtTop) {
				head.insertBefore(styleElement, head.firstChild);
			} else if(lastStyleElementInsertedAtTop.nextSibling) {
				head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
			} else {
				head.appendChild(styleElement);
			}
			styleElementsInsertedAtTop.push(styleElement);
		} else if (options.insertAt === "bottom") {
			head.appendChild(styleElement);
		} else {
			throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
		}
	}
	
	function removeStyleElement(styleElement) {
		styleElement.parentNode.removeChild(styleElement);
		var idx = styleElementsInsertedAtTop.indexOf(styleElement);
		if(idx >= 0) {
			styleElementsInsertedAtTop.splice(idx, 1);
		}
	}
	
	function createStyleElement(options) {
		var styleElement = document.createElement("style");
		styleElement.type = "text/css";
		insertStyleElement(options, styleElement);
		return styleElement;
	}
	
	function createLinkElement(options) {
		var linkElement = document.createElement("link");
		linkElement.rel = "stylesheet";
		insertStyleElement(options, linkElement);
		return linkElement;
	}
	
	function addStyle(obj, options) {
		var styleElement, update, remove;
	
		if (options.singleton) {
			var styleIndex = singletonCounter++;
			styleElement = singletonElement || (singletonElement = createStyleElement(options));
			update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
			remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
		} else if(obj.sourceMap &&
			typeof URL === "function" &&
			typeof URL.createObjectURL === "function" &&
			typeof URL.revokeObjectURL === "function" &&
			typeof Blob === "function" &&
			typeof btoa === "function") {
			styleElement = createLinkElement(options);
			update = updateLink.bind(null, styleElement);
			remove = function() {
				removeStyleElement(styleElement);
				if(styleElement.href)
					URL.revokeObjectURL(styleElement.href);
			};
		} else {
			styleElement = createStyleElement(options);
			update = applyToTag.bind(null, styleElement);
			remove = function() {
				removeStyleElement(styleElement);
			};
		}
	
		update(obj);
	
		return function updateStyle(newObj) {
			if(newObj) {
				if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
					return;
				update(obj = newObj);
			} else {
				remove();
			}
		};
	}
	
	var replaceText = (function () {
		var textStore = [];
	
		return function (index, replacement) {
			textStore[index] = replacement;
			return textStore.filter(Boolean).join('\n');
		};
	})();
	
	function applyToSingletonTag(styleElement, index, remove, obj) {
		var css = remove ? "" : obj.css;
	
		if (styleElement.styleSheet) {
			styleElement.styleSheet.cssText = replaceText(index, css);
		} else {
			var cssNode = document.createTextNode(css);
			var childNodes = styleElement.childNodes;
			if (childNodes[index]) styleElement.removeChild(childNodes[index]);
			if (childNodes.length) {
				styleElement.insertBefore(cssNode, childNodes[index]);
			} else {
				styleElement.appendChild(cssNode);
			}
		}
	}
	
	function applyToTag(styleElement, obj) {
		var css = obj.css;
		var media = obj.media;
	
		if(media) {
			styleElement.setAttribute("media", media)
		}
	
		if(styleElement.styleSheet) {
			styleElement.styleSheet.cssText = css;
		} else {
			while(styleElement.firstChild) {
				styleElement.removeChild(styleElement.firstChild);
			}
			styleElement.appendChild(document.createTextNode(css));
		}
	}
	
	function updateLink(linkElement, obj) {
		var css = obj.css;
		var sourceMap = obj.sourceMap;
	
		if(sourceMap) {
			// http://stackoverflow.com/a/26603875
			css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
		}
	
		var blob = new Blob([css], { type: "text/css" });
	
		var oldSrc = linkElement.href;
	
		linkElement.href = URL.createObjectURL(blob);
	
		if(oldSrc)
			URL.revokeObjectURL(oldSrc);
	}


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _react = __webpack_require__(2);
	
	var _react2 = _interopRequireDefault(_react);
	
	var _jsreportStudio = __webpack_require__(1);
	
	var _jsreportStudio2 = _interopRequireDefault(_jsreportStudio);
	
	var _ChangesTable = __webpack_require__(4);
	
	var _ChangesTable2 = _interopRequireDefault(_ChangesTable);
	
	var _VersionControl = __webpack_require__(5);
	
	var _VersionControl2 = _interopRequireDefault(_VersionControl);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var LocalChangesEditor = function (_Component) {
	  _inherits(LocalChangesEditor, _Component);
	
	  function LocalChangesEditor(props) {
	    _classCallCheck(this, LocalChangesEditor);
	
	    var _this = _possibleConstructorReturn(this, (LocalChangesEditor.__proto__ || Object.getPrototypeOf(LocalChangesEditor)).call(this, props));
	
	    _this.state = { message: '' };
	    return _this;
	  }
	
	  _createClass(LocalChangesEditor, [{
	    key: 'componentDidMount',
	    value: function componentDidMount() {
	      this.load();
	    }
	  }, {
	    key: 'load',
	    value: function () {
	      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
	        var res;
	        return regeneratorRuntime.wrap(function _callee$(_context) {
	          while (1) {
	            switch (_context.prev = _context.next) {
	              case 0:
	                _context.prev = 0;
	                _context.next = 3;
	                return _jsreportStudio2.default.api.get('/api/version-control/local-changes');
	
	              case 3:
	                res = _context.sent;
	
	                this.setState({ diff: res });
	                _context.next = 10;
	                break;
	
	              case 7:
	                _context.prev = 7;
	                _context.t0 = _context['catch'](0);
	
	                alert(_context.t0);
	
	              case 10:
	              case 'end':
	                return _context.stop();
	            }
	          }
	        }, _callee, this, [[0, 7]]);
	      }));
	
	      function load() {
	        return _ref.apply(this, arguments);
	      }
	
	      return load;
	    }()
	  }, {
	    key: 'commit',
	    value: function () {
	      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
	        return regeneratorRuntime.wrap(function _callee2$(_context2) {
	          while (1) {
	            switch (_context2.prev = _context2.next) {
	              case 0:
	                if (this.state.message) {
	                  _context2.next = 2;
	                  break;
	                }
	
	                return _context2.abrupt('return', this.setState({ error: 'Commit message must be filled' }));
	
	              case 2:
	                _context2.prev = 2;
	                _context2.next = 5;
	                return _jsreportStudio2.default.api.post('/api/version-control/commit', {
	                  data: {
	                    message: this.state.message
	                  }
	                });
	
	              case 5:
	                this.setState({ message: '', error: null });
	                _context2.next = 8;
	                return this.load();
	
	              case 8:
	                _context2.next = 13;
	                break;
	
	              case 10:
	                _context2.prev = 10;
	                _context2.t0 = _context2['catch'](2);
	
	                alert(_context2.t0);
	
	              case 13:
	              case 'end':
	                return _context2.stop();
	            }
	          }
	        }, _callee2, this, [[2, 10]]);
	      }));
	
	      function commit() {
	        return _ref2.apply(this, arguments);
	      }
	
	      return commit;
	    }()
	  }, {
	    key: 'revert',
	    value: function () {
	      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
	        return regeneratorRuntime.wrap(function _callee3$(_context3) {
	          while (1) {
	            switch (_context3.prev = _context3.next) {
	              case 0:
	                _context3.prev = 0;
	
	                if (!confirm('This will delete all your uncommited files and revert changes. Are you sure?')) {
	                  _context3.next = 5;
	                  break;
	                }
	
	                _context3.next = 4;
	                return _jsreportStudio2.default.api.post('/api/version-control/revert');
	
	              case 4:
	                // studio needs a method to reload entities, it would be also usefull for export import
	                location.reload();
	
	              case 5:
	                _context3.next = 10;
	                break;
	
	              case 7:
	                _context3.prev = 7;
	                _context3.t0 = _context3['catch'](0);
	
	                alert(_context3.t0);
	
	              case 10:
	              case 'end':
	                return _context3.stop();
	            }
	          }
	        }, _callee3, this, [[0, 7]]);
	      }));
	
	      function revert() {
	        return _ref3.apply(this, arguments);
	      }
	
	      return revert;
	    }()
	  }, {
	    key: 'history',
	    value: function history() {
	      _jsreportStudio2.default.openTab({ key: 'versionControlHistory', editorComponentKey: 'versionControlHistory', title: 'Commits history' });
	    }
	  }, {
	    key: 'render',
	    value: function render() {
	      var _this2 = this;
	
	      return _react2.default.createElement(
	        'div',
	        { className: 'block custom-editor' },
	        _react2.default.createElement(
	          'h1',
	          null,
	          _react2.default.createElement('i', { className: 'fa fa-history' }),
	          ' uncommited changes',
	          _react2.default.createElement(
	            'button',
	            { className: 'button confirmation', onClick: function onClick() {
	                return _this2.history();
	              } },
	            'Commits history'
	          )
	        ),
	        _react2.default.createElement(
	          'div',
	          { className: 'form-group' },
	          _react2.default.createElement(
	            'label',
	            null,
	            'Message'
	          ),
	          _react2.default.createElement('input', { type: 'text', value: this.state.message, onChange: function onChange(event) {
	              return _this2.setState({ message: event.target.value, error: null });
	            } }),
	          _react2.default.createElement(
	            'span',
	            { style: { color: 'red', display: this.state.error ? 'block' : 'none' } },
	            this.state.error
	          )
	        ),
	        _react2.default.createElement(
	          'div',
	          null,
	          _react2.default.createElement(
	            'button',
	            { className: 'button confirmation', onClick: function onClick() {
	                return _this2.commit();
	              } },
	            'Commit'
	          ),
	          _react2.default.createElement(
	            'button',
	            { className: 'button danger', onClick: function onClick() {
	                return _this2.revert();
	              } },
	            'Revert'
	          ),
	          _react2.default.createElement(
	            'button',
	            { className: 'button confirmation', onClick: function onClick() {
	                return _this2.load();
	              } },
	            'Refresh'
	          )
	        ),
	        _react2.default.createElement(
	          'div',
	          { className: _VersionControl2.default.listContainer + ' block-item' },
	          this.state.diff ? _react2.default.createElement(_ChangesTable2.default, { changes: this.state.diff }) : ''
	        )
	      );
	    }
	  }]);
	
	  return LocalChangesEditor;
	}(_react.Component);
	
	exports.default = LocalChangesEditor;

/***/ }
/******/ ]);