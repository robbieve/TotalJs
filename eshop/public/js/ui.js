COMPONENT('click', function() {
	var self = this;

	self.readonly();

	self.click = function() {
		var value = self.attr('data-value');
		if (typeof(value) === 'string')
			self.set(self.parser(value));
		else
			self.get(self.attr('data-component-path'))(self);
	};

	self.make = function() {
		self.element.on('click', self.click);
		var enter = self.attr('data-enter');
		enter && $(enter).on('keydown', 'input', function(e) {
			e.keyCode === 13 && setTimeout(function() {
				!self.element.get(0).disabled && self.click();
			}, 100);
		});
	};
});

COMPONENT('exec', function() {
	var self = this;
	self.readonly();
	self.blind();
	self.make = function() {
		self.element.on('click', self.attr('data-selector') || '.exec', function() {
			var el = $(this);
			var attr = el.attr('data-exec');
			attr && EXEC(attr, el);
		});
	};
});

COMPONENT('visible', function() {
	var self = this;
	var condition = self.attr('data-if');
	self.readonly();
	self.setter = function(value) {
		var is = true;
		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? true : false;
		self.element.toggleClass('hidden', !is);
	};
});

COMPONENT('message', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-message hidden');

		self.element.on('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			visible && e.keyCode === 27 && self.hide();
		});
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.callback && self.callback();
		self.element.removeClass('ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {
		!is && self.html('<div><div class="ui-message-body"><span class="fa fa-warning"></span><div class="ui-center"></div></div><button>' + (self.attr('data-button') || 'Close') + '</button></div>');
		timer && clearTimeout(timer);
		visible = true;
		self.element.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.element.find('.fa').removeClass().addClass('fa ' + icon);
		self.element.find('.ui-center').html(text);
		self.element.removeClass('hidden');
		setTimeout(function() {
			self.element.addClass('ui-message-visible');
		}, 5);
	};
});

COMPONENT('validation', function() {

	var self = this;
	var path;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find(self.attr('data-selector') || 'button');
		elements.prop({ disabled: true });
		self.evaluate = self.attr('data-if');
		path = self.path.replace(/\.\*$/, '');
		self.watch(self.path, self.state, true);
	};

	self.state = function() {
		var disabled = jC.disabled(path);
		if (!disabled && self.evaluate)
			disabled = !EVALUATE(self.path, self.evaluate);
		elements.prop({ disabled: disabled });
	};
});

COMPONENT('checkbox', function() {

	var self = this;
	var input;
	var isRequired = self.attr('data-required') === 'true';

	self.validate = function(value) {
		var type = typeof(value);
		if (input.prop('disabled') || !isRequired)
			return true;
		value = type === 'undefined' || type === 'object' ? '' : value.toString();
		return value === 'true' || value === 'on';
	};

	self.required = function(value) {
		self.find('span').toggleClass('ui-checkbox-label-required', value === true);
		isRequired = value;
		return self;
	};

	!isRequired && self.noValid();

	self.make = function() {
		self.element.addClass('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), isRequired ? ' class="ui-checkbox-label-required"' : ''));
		self.element.on('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.element.toggleClass('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('dropdown', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var select;
	var container;

	self.validate = function(value) {

		if (select.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EXEC('$calendar.hide');

		if (self.type === 'currency' || self.type === 'number')
			return value > 0;

		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.element.find('.ui-dropdown-label').toggleClass('ui-dropdown-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.render = function(arr) {

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = self.attr('data-source-text') || 'name';
		var propValue = self.attr('data-source-value') || 'id';
		var emptyText = self.attr('data-empty');

		emptyText !== undefined && builder.push('<option value="">{0}</option>'.format(emptyText));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		select.html(builder.join(''));
	};

	self.make = function() {

		var options = [];

		(self.attr('data-options') || '').split(';').forEach(function(item) {
			item = item.split('|');
			options.push('<option value="{0}">{1}</option>'.format(item[1] === undefined ? item[0] : item[1], item[0]));
		});

		self.element.addClass('ui-dropdown-container');

		var label = self.html();
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-component-bind="">{0}</select></div>'.format(options.join(''));
		var builder = [];

		if (label.length) {
			var icon = self.attr('data-icon');
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(isRequired ? ' ui-dropdown-label-required' : '', icon ? '<span class="fa {0}"></span> '.format(icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).addClass('ui-dropdown-values');

		select = self.find('select');
		container = self.find('.ui-dropdown');

		var ds = self.attr('data-source');
		if (!ds)
			return;

		var prerender = function(path) {
			var value = self.get(self.attr('data-source'));
			!NOTMODIFIED(self.id, value) && self.render(value || EMPTYARRAY);
		};

		self.watch(ds, prerender, true);
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-dropdown-invalid', self.isInvalid());
	};
});

COMPONENT('textbox', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var validation = self.attr('data-validate');
	var input;
	var container;

	self.validate = function(value) {

		if (input.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EXEC('$calendar.hide');

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return validation ? self.evaluate(value, validation, true) ? true : false : value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.element.find('.ui-textbox-label').toggleClass('ui-textbox-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('type', self.type === 'password' ? self.type : 'text');
		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-component-keypress', self.attr('data-component-keypress'));
		attrs.attr('data-component-keypress-delay', self.attr('data-component-keypress-delay'));
		attrs.attr('data-component-bind', '');

		tmp = self.attr('data-align');
		tmp && attrs.attr('class', 'ui-' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');

		var content = self.html();
		var icon = self.attr('data-icon');
		var icon2 = self.attr('data-control-icon');
		var increment = self.attr('data-increment') === 'true';

		builder.push('<input {0} />'.format(attrs.join(' ')));

		if (!icon2 && self.type === 'date')
			icon2 = 'fa-calendar';
		else if (self.type === 'search') {
			icon2 = 'fa-search ui-textbox-control-icon';
			self.element.on('click', '.ui-textbox-control-icon', function() {
				self.$stateremoved = false;
				$(this).removeClass('fa-times').addClass('fa-search');
				self.set('');
			});
			self.getter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = value ? false : true;
				self.find('.ui-textbox-control-icon').toggleClass('fa-times', value ? true : false).toggleClass('fa-search', value ? false : true);
			};
		}

		icon2 && builder.push('<div><span class="fa {0}"></span></div>'.format(icon2));
		increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');
		increment && self.element.on('click', '.fa-caret-up,.fa-caret-down', function(e) {
			var el = $(this);
			var inc = -1;
			if (el.hasClass('fa-caret-up'))
				inc = 1;
			self.change(true);
			self.inc(inc);
		});

		self.type === 'date' && self.element.on('click', '.fa-calendar', function(e) {
			e.preventDefault();
			window.$calendar && window.$calendar.toggle($(this).parent().parent(), self.element.find('input').val(), function(date) {
				self.set(date);
			});
		});

		if (!content.length) {
			self.element.addClass('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.find('.ui-textbox');
			return;
		}

		var html = builder.join('');
		builder = [];
		builder.push('<div class="ui-textbox-label{0}">'.format(isRequired ? ' ui-textbox-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span> '.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.element.addClass('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', self.isInvalid());
	};
});

COMPONENT('textarea', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var input;
	var container;

	self.validate = function(value) {

		var is = false;
		var type = typeof(value);
		if (input.prop('disabled') || isRequired)
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EXEC('$calendar.hide');
		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.element.find('.ui-textarea-label').toggleClass('ui-textarea-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-component-bind', '');

		tmp = self.attr('data-height');
		tmp && attrs.attr('style', 'height:' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');
		builder.push('<textarea {0}></textarea>'.format(attrs.join(' ')));

		var element = self.element;
		var content = element.html();

		if (!content.length) {
			self.element.addClass('ui-textarea ui-textarea-container');
			self.html(builder.join(''));
			input = self.find('textarea');
			container = self.element;
			return;
		}

		var height = self.attr('data-height');
		var icon = self.attr('data-icon');
		var html = builder.join('');

		builder = [];
		builder.push('<div class="ui-textarea-label{0}">'.format(isRequired ? ' ui-textarea-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span> '.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textarea">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.element.addClass('ui-textarea-container');
		input = self.find('textarea');
		container = self.find('.ui-textarea');
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textarea-invalid', self.isInvalid());
	};
});

COMPONENT('template', function() {
	var self = this;
	self.readonly();
	self.make = function(template) {

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.element.find('script');

		if (!script.length) {
			script = self.element;
			self.element = self.element.parent();
		}

		self.template = Tangular.compile(script.html());
		script.remove();
	};

	self.setter = function(value) {
		if (NOTMODIFIED(self.id, value))
			return;
		if (!value)
			return self.element.addClass('hidden');
		KEYPRESS(function() {
			self.html(self.template(value)).removeClass('hidden');
		}, 100, self.id);
	};
});

COMPONENT('repeater', function() {

	var self = this;
	var recompile = false;

	self.readonly();

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-component="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			builder.push(self.template(item).replace(/\$index/g, i.toString()).replace(/\$/g, self.path + '[' + i + ']'));
		}

		self.html(builder);
		recompile && jC.compile();
	};
});

COMPONENT('error', function() {
	var self = this;
	var element;

	self.readonly();

	self.make = function() {
		self.element.append('<ul class="ui-error hidden"></ul>');
		element = self.element.find('ul');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			element.addClass('hidden');
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<li><span class="fa fa-times-circle"></span> ' + value[i].error + '</li>');

		element.empty();
		element.append(builder.join(''));
		element.removeClass('hidden');
	};
});

COMPONENT('cookie', function() {
	var self = this;
	self.readonly();
	self.singleton();
	self.make = function() {
		var cookie = localStorage.getItem('cookie');
		if (cookie) {
			self.element.addClass('hidden');
			return;
		}

		self.element.removeClass('hidden').addClass('ui-cookie');
		self.element.append('<button>' + (self.attr('data-button') || 'OK') + '</button>');
		self.element.on('click', 'button', function() {
			localStorage.setItem('cookie', '1');
			self.element.addClass('hidden');
		});
	};
});

// ==========================================================
// @{BLOCK manager}
// ==========================================================

COMPONENT('expander', function() {
	var self = this;
	self.readonly();
	self.make = function() {
		self.element.addClass('ui-expander');
		self.element.wrapInner('<div class="ui-expander-container"></div>');
		self.append('<div class="ui-expander-fade"></div><div class="ui-expander-button"><span class="fa fa-angle-double-down"></span></div>');
		self.element.on('click', '.ui-expander-button', function() {
			self.element.toggleClass('ui-expander-expanded');
			self.element.find('.ui-expander-button').find('.fa').toggleClass('fa-angle-double-down fa-angle-double-up');
		});
	};
});

COMPONENT('textboxtags', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var isString = false;
	var container;

	if (!window.$textboxtagstemplate)
		window.$textboxtagstemplate = Tangular.compile('<div class="ui-textboxtags-tag" data-name="{{ name }}">{{ name }}<i class="fa fa-times"></i></div>');

	var template = window.$textboxtagstemplate;

	self.validate = function(value) {
		return isRequired ? value && value.length > 0 : true;
	};

	self.required = function(value) {
		self.element.find('.ui-textboxtags-label').toggleClass('ui-textboxtags-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var height = self.attr('data-height');
		var icon = self.attr('data-icon');
		var content = self.html();
		var html = '<div class="ui-textboxtags-values"' + (height ? ' style="min-height:' + height + '"' : '') + '><input type="text" placeholder="' + (self.attr('data-placeholder') || '') + '" /></div>';

		isString = self.type === 'string';

		if (content.length) {
			self.element.empty();
			self.element.append('<div class="ui-textboxtags-label' + (isRequired ? ' ui-textboxtags-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			self.element.append('<div class="ui-textboxtags">' + html + '</div>');
		} else {
			self.element.addClass('ui-textboxtags');
			self.element.append(html);
		}

		self.element.on('click', function(e) {
			self.element.find('input').focus();
		});

		container = self.element.find('.ui-textboxtags-values');
		container.on('click', '.fa-times', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var el = $(this);
			var arr = self.get();

			if (isString)
				arr = self.split(arr);

			if (!arr || !(arr instanceof Array) || !arr.length)
				return;

			var index = arr.indexOf(el.parent().attr('data-name'));
			if (index === -1)
				return;

			arr.splice(index, 1);
			self.set(isString ? arr.join(', ') : arr);
			self.change(true);
		});

		self.element.on('keydown', 'input', function(e) {

			if (e.keyCode === 8) {
				if (this.value)
					return;
				var arr = self.get();
				if (isString)
					arr = self.split(arr);
				if (!arr || !(arr instanceof Array) || !arr.length)
					return;
				arr.pop();
				self.set(isString ? arr.join(', ') : arr);
				self.change(true);
				return;
			}

			if (e.keyCode !== 13 || !this.value)
				return;

			var arr = self.get();
			var value = this.value;

			if (isString)
				arr = self.split(arr);

			if (!(arr instanceof Array))
				arr = [];

			if (arr.indexOf(value) === -1)
				arr.push(value);
			else
				return;

			this.value = '';
			self.set(isString ? arr.join(', ') : arr);
			self.change(true);
		});
	};

	self.split = function(value) {
		if (!value)
			return new Array(0);
		var arr = value.split(',');
		for (var i = 0, length = arr.length; i < length; i++)
			arr[i] = arr[i].trim();
		return arr;
	};

	self.setter = function(value) {

		if (NOTMODIFIED(self.id, value))
			return;

		container.find('.ui-textboxtags-tag').remove();

		if (!value || !value.length)
			return;

		var arr = isString ? self.split(value) : value;
		var builder = '';
		for (var i = 0, length = arr.length; i < length; i++)
			builder += template({ name: arr[i] });

		container.prepend(builder);
	};

	self.state = function(type) {
		self.element.find('.ui-textboxtags').toggleClass('ui-textboxtags-invalid', self.isInvalid());
	};
});

COMPONENT('page', function() {
	var self = this;
	var isProcessed = false;
	var isProcessing = false;
	var reload = self.attr('data-reload');

	self.hide = function() {
		self.set('');
	};

	self.getter = null;
	self.setter = function(value) {

		if (isProcessing)
			return;

		var el = self.element;
		var is = el.attr('data-if') == value;

		if (isProcessed || !is) {
			el.toggleClass('hidden', !is);
			is && reload && self.get(reload)();
			return;
		}

		SETTER('loading', 'show');
		isProcessing = true;

		INJECT(el.attr('data-template'), el, function() {
			isProcessing = false;

			var init = el.attr('data-init');
			if (init) {
				var fn = GET(init || '');
				typeof(fn) === 'function' && fn(self);
			}

			reload && self.get(reload)();
			isProcessed = true;
			setTimeout(function() {
				el.toggleClass('hidden', !is);
			}, 200);
			SETTER('loading', 'hide', 1000);
		});
	};
});

COMPONENT('grid', function() {

	var self = this;
	var target;
	var page;

	self.click = function(index, row, button) {console.log(index, row, button)};
	self.make = function(template) {

		var element = self.element.find('script');

		self.template = Tangular.compile(element.html());
		self.element.on('click', 'tr', function() {});
		self.element.addClass('ui-grid');
		self.html('<div><div class="ui-grid-page"></div><table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody></tbody></table></div><div data-component="pagination" data-component-path="{0}" data-max="8" data-pages="{1}" data-items="{2}" data-target-path="{3}"></div>'.format(self.path, self.attr('data-pages'), self.attr('data-items'), self.attr('data-pagination-path')));
		self.element.on('click', 'button', function() {
			switch (this.name) {
				default:
					var index = parseInt($(this).closest('tr').attr('data-index'));
					self.click(index, self.get().items[index], this);
					break;
			}
		});

		target = self.element.find('tbody');
		page = self.element.find('.ui-grid-page');

		setTimeout(function() {
			var max = self.attr('data-max');
			if (max === 'auto')
				self.max = (Math.floor(($(window).height() - (self.element.offset().top + 250)) / 27));
			else
				self.max = parseInt(max);
			if (self.max < 10)
				self.max = 10;
		}, 10);

		return true;
	};

	self.refresh = function() {
		self.set(self.get());
	};

	self.prerender = function(index, row) {
		return self.template(row).replace('<tr', '<tr data-index="' + index + '"');
	};

	self.setter = function(value) {
		var output = [];
		var items = value.items;

		if (items) {
			for (var i = 0, length = items.length; i < length; i++)
				output.push(self.prerender(i, items[i]));
		}

		if (!output.length) {
			var empty = self.attr('data-empty');
			if (empty) {
				page.html('&nbsp;');
				output.push('<tr><td style="text-align:center;padding:50px 0;background-color:white"><div style="padding:40px 20px;border:2px solid #F0F0F0;max-width:500px;margin:0 auto;border-radius:4px">{0}</div></td></tr>'.format(empty));
			} else
				page.empty();
		} else {
			var format = self.attr('data-page');
			if (format)
				page.html(format.replace(/\#/g, value.page));
			else
				page.empty();
		}

		target.html(output);
	};
});

COMPONENT('form', function() {

	var self = this;
	var autocenter;

	if (!MAN.$$form) {
		window.$$form_level = window.$$form_level || 1;
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($.components.findById($(this).attr('data-id')).path, '');
			window.$$form_level--;
		});

		$(window).on('resize', function() {
			FIND('form', true).forEach(function(component) {
				!component.element.hasClass('hidden') && component.resize();
			});
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hasClass('ui-form-container-padding') || el.hasClass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.addClass(cls);
			setTimeout(function() {
				form.removeClass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function(hide) { self.hide(); };
	self.cancel = function(hide) { self.hide(); };
	self.onHide = function(){};

	var hide = self.hide = function() {
		self.set('');
		self.onHide();
	};

	self.resize = function() {
		if (!autocenter)
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(window).height();
		var r = (wh / 2) - (fh / 2);
		if (r > 30)
			ui.css({ marginTop: (r - 15) + 'px' });
		else
			ui.css({ marginTop: '20px' });
	};

	self.make = function() {
		var width = self.attr('data-width') || '800px';
		var submit = self.attr('data-submit');
		var enter = self.attr('data-enter');
		autocenter = self.attr('data-autocenter') === 'true';
		self.condition = self.attr('data-if');

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-id="{2}"></span>{3}</div>{4}</div></div>'.format(self._id, width, self.id, self.attr('data-title')));

		self.element.data(COM_ATTR, self);
		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.element = el;

		self.element.on('scroll', function() {
			EXEC('$calendar.hide');
		});

		self.element.find('button').on('click', function(e) {
			window.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](hide);
					break;
			}
		});

		enter === 'true' && self.element.on('keydown', 'input', function(e) {
			e.keyCode === 13 && self.element.find('button[name="submit"]').get(0).disabled && self.submit(hide);
		});

		return true;
	};

	self.getter = null;
	self.setter = function(value) {

		var isHidden = !EVALUATE(self.path, self.condition);
		self.element.toggleClass('hidden', isHidden);
		EXEC('$calendar.hide');

		if (isHidden) {
			self.release(true);
			self.element.find('.ui-form').removeClass('ui-form-animate');
			return;
		}

		self.resize();
		self.release(false);

		var el = self.element.find('input,select,textarea');
		el.length > 0 && el.eq(0).focus();
		window.$$form_level++;
		self.element.css('z-index', window.$$form_level * 10);
		self.element.animate({ scrollTop: 0 }, 0, function() {
			setTimeout(function() {
				self.element.find('.ui-form').addClass('ui-form-animate');
			}, 300);
		});
	};
});

COMPONENT('pictures', function() {

	var self = this;

	self.skip = false;
	self.readonly();

	self.make = function() {
		self.element.addClass('ui-pictures');
	};

	self.setter = function(value) {

		if (typeof(value) === 'string')
			value = value.split(',');

		if (this.skip) {
			this.skip = false;
			return;
		}

		this.element.find('.fa').unbind('click');
		this.element.find('img').unbind('click');
		this.element.empty();

		if (!(value instanceof Array) || !value.length)
			return;

		var count = 0;
		var builder = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var id = value[i];
			id && builder.push('<div data-id="' + id + '" class="col-xs-3 m"><span class="fa fa-times"></span><img src="/images/small/{0}.jpg" class="img-responsive" alt="" /></div>'.format(id));
		}

		self.html(builder);
		setTimeout(FN('() => $(window).trigger("resize");'), 500);

		this.element.find('.fa').bind('click', function(e) {

			var el = $(this).parent().remove();
			var id = [];

			self.element.find('div').each(function() {
				id.push($(this).attr('data-id'));
			});

			self.skip = true;
			self.set(id);
		});

		this.element.find('img').bind('click', function() {

			var selected = self.element.find('.selected');
			var el = $(this);

			el.toggleClass('selected');

			if (!selected.length)
				return;

			var id1 = el.parent().attr('data-id');
			var id2 = selected.parent().attr('data-id');
			var arr = self.get();

			var index1 = arr.indexOf(id1);
			var index2 = arr.indexOf(id2);

			arr[index1] = id2;
			arr[index2] = id1;

			setTimeout(function() {
				self.change();
				self.set(arr);
			}, 500);
		});
	};
});

COMPONENT('fileupload', function() {

	var self = this;

	self.error = function(err) {};
	self.readonly();
	self.setter = null;

	var isRequired = this.element.attr('data-required') === 'true';

	this.make = function() {

		var element = this.element;
		var content = self.html();
		var placeholder = self.attr('data-placeholder');
		var icon = self.attr('data-icon');
		var accept = self.attr('data-accept');
		var url = self.attr('data-url');

		if (!url) {
			if (window.managerurl)
				url = window.managerurl + '/upload/';
			else
				url = window.location.pathname
		}

		var multiple = self.attr('data-multiple') === 'true';
		var html = '<span class="fa fa-folder"></span><input type="file"' + (accept ? ' accept="' + accept + '"' : '') + (multiple ? ' multiple="multiple"' : '') + ' class="ui-fileupload-input" /><input type="text" placeholder="' + (placeholder ? placeholder : '') + '" readonly="readonly" />';

		if (content.length > 0) {
			element.empty();
			element.append('<div class="ui-fileupload-label' + (isRequired ? ' ui-fileupload-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			element.append('<div class="ui-fileupload">' + html + '</div>');
		} else {
			element.addClass('ui-fileupload');
			element.append(html);
		}

		element.find('.ui-fileupload-input').bind('change', function(evt) {
			var files = evt.target.files;
			var filename = [];
			var el = this;
			$(el).parent().find('input[type="text"]').val(filename.join(', '));

			var data = new FormData();
			for (var i = 0, length = files.length; i < length; i++)
				data.append('file' + i, files[i]);

			var loading = FIND('loading');
			if (loading)
				loading.show();

			$.components.UPLOAD(url, data, function(response, err) {

				if (err) {

					if (loading)
						loading.hide(500);

					var message = FIND('message');
					if (message)
						message.warning(self.attr('data-error-large'));
					else
						alert(self.attr('data-error-large'));

					return;
				}

				self.change();
				el.value = '';

				if (self.attr('data-extension') === 'false') {
					for (var i = 0, length = response.length; i < length; i++) {
						var filename = response[i];
						var index = filename.lastIndexOf('.');
						if (index === -1)
							continue;
						response[i] = filename.substring(0, index);
					}
				}

				if (self.attr('data-singlefile') === 'true')
					self.set(response[0]);
				else
					self.push(response);

				if (loading)
					loading.hide(500);
			});
		});
	};
});

COMPONENT('repeater-group', function() {

	var self = this;
	var template_group;
	var group;

	self.readonly();

	self.make = function() {
		group = self.attr('data-group');
		self.element.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();

			if (!index) {
				self.template = Tangular.compile(html);
				return;
			}

			template_group = Tangular.compile(html);
		});
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.element.empty();
			return;
		}

		if (NOTMODIFIED(self.id, value))
			return;

		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][group];
			if (!name)
				name = '0';

			if (!groups[name])
				groups[name] = [value[i]];
			else
				groups[name].push(value[i]);
		}

		var index = 0;
		var indexgroup = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.sort();
		keys.forEach(function(key) {
			var arr = groups[key];

			if (key !== '0') {
				var options = {};
				options[group] = key;
				options.length = arr.length;
				options.index = indexgroup++;
				builder += template_group(options);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				item.index = index++;
				builder += self.template(item).replace(/\$index/g, index.toString()).replace(/\$/g, self.path + '[' + index + ']');
			}
		});

		self.element.empty().append(builder);
	};
});

COMPONENT('dropdowncheckbox', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var container;
	var data = [];
	var values;

	if (!window.$dropdowncheckboxtemplate)
		window.$dropdowncheckboxtemplate = Tangular.compile('<div><label><input type="checkbox" value="{{ index }}" /><span>{{ text }}</span></label></div>');

	var template = window.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.make = function() {

		var options = [];
		var element = self.element;
		var arr = (self.attr('data-options') || '').split(';');

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i].split('|');
			var value = item[1] === undefined ? item[0] : item[1];
			if (self.type === 'number')
				value = parseInt(value);
			var obj = { value: value, text: item[0], index: i };
			options.push(template(obj));
			data.push(obj);
		}

		var content = element.html();
		var icon = self.attr('data-icon');
		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">' + options.join('') + '</div>';

		if (content.length) {
			element.empty();
			element.append('<div class="ui-dropdowncheckbox-label' + (required ? ' ui-dropdowncheckbox-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			element.append(html);
		} else
			element.append(html);

		self.toggle('ui-dropdowncheckbox-container');
		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');

		self.element.on('click', '.ui-dropdowncheckbox', function(e) {

			var el = $(this);
			if (el.hasClass('ui-disabled'))
				return;

			container.toggleClass('hidden');

			if (window.$dropdowncheckboxelement) {
				window.$dropdowncheckboxelement.addClass('hidden');
				window.$dropdowncheckboxelement = null;
			}

			if (!container.hasClass('hidden'))
				window.$dropdowncheckboxelement = container;

			e.stopPropagation();
		});

		self.element.on('click', 'input,label', function(e) {

			e.stopPropagation();

			var is = this.checked;
			var index = parseInt(this.value);
			var value = data[index];
			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);
			if (is)
				index === -1 && arr.push(value);
			else
				index !== -1 && arr.splice(index, 1);

			self.reset(true);
			self.set(arr, undefined, 2);
		});

		var ds = self.attr('data-source');
		if (!ds)
			return;

		self.watch(ds, prepare);
		setTimeout(function() {
			prepare(ds, GET(ds));
		}, 500);
	};

	function prepare(path, value) {

		if (NOTMODIFIED(path, value))
			return;

		var clsempty = 'ui-dropdowncheckbox-values-empty';

		if (!value) {
			container.addClass(clsempty).empty().html(self.attr('data-empty'));
			return;
		}

		var kv = self.attr('data-source-value') || 'id';
		var kt = self.attr('data-source-text') || 'name';
		var builder = '';

		data = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			data.push(item);
			builder += template(item);
		}

		if (builder)
			container.removeClass(clsempty).empty().append(builder);
		else
			container.addClass(clsempty).empty().html(self.attr('data-empty'));

		self.setter(self.get());
	}

	self.setter = function(value) {

		if (NOTMODIFIED(self.id, value))
			return;

		var label = '';
		var empty = self.attr('data-placeholder');

		if (value && value.length) {
			var remove = [];
			for (var i = 0, length = value.length; i < length; i++) {
				var selected = value[i];
				var index = 0;
				var is = false;

				while (true) {
					var item = data[index++];
					if (item === undefined)
						break;
					if (item.value != selected)
						continue;
					label += (label ? ', ' : '') + item.text;
					is = true;
				}

				!is && remove.push(selected);
			}

			var refresh = false;

			while (true) {
				var item = remove.shift();
				if (item === undefined)
					break;
				value.splice(value.indexOf(item), 1);
				refresh = true;
			}

			refresh && MAN.set(self.path, value);
		}

		container.find('input').each(function() {
			var index = parseInt(this.value);
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			if (checked)
				checked = value.indexOf(checked.value) !== -1;
			this.checked = checked;
		});

		!label && value && MAN.set(self.path, []);

		if (!label && empty) {
			values.html('<span>{0}</span>'.format(empty));
			return;
		}

		values.html(label);
	};

	self.state = function(type) {
		self.element.find('.ui-dropdowncheckbox').toggleClass('ui-dropdowncheckbox-invalid', self.isInvalid());
	};

	if (window.$dropdowncheckboxevent)
		return;

	window.$dropdowncheckboxevent = true;
	$(document).on('click', function(e) {
		if (!window.$dropdowncheckboxelement)
			return;
		window.$dropdowncheckboxelement.addClass('hidden');
		window.$dropdowncheckboxelement = null;
	});
});

COMPONENT('crop', function() {
	var self = this;
	var width, height, canvas, context;
	var img = new Image();
	var can = false;
	var is = false;
	var zoom = 100;
	var current = { x: 0, y: 0 };
	var offset = { x: 0, y: 0 };
	var cache = { x: 0, y: 0, zoom: 0 };
	var bgcolor = '';

	self.noValid();
	self.getter = null;

	img.onload = function () {
		can = true;
		zoom = 100;

		var nw = (img.width / 2) >> 0;
		var nh = (img.height / 2) >> 0;

		if (img.width > width) {

			var ratio;
			var p;

			p = (width / (img.width / 100)) >> 0;
			zoom -= zoom - p;
			nh = ((img.height * (p / 100)) / 2) >> 0;
			nw = ((img.width * (p / 100)) / 2) >> 0;
		}

		 // centering
		cache.x = current.x = (width / 2) - nw;
		cache.y = current.y = (height / 2) - nh;
		cache.zoom = zoom;
		self.redraw();
	};

	self.resize = function(w, h) {
		width = w;
		height = h;
		canvas.width = w;
		canvas.height = h;
		self.find('div').html('<span><b>{0}</b>x<b>{1}</b>px</span>'.format(w, h));
	};

	self.output = function(type) {
		if (type)
			return canvas.toDataURL(type);
		if (!bgcolor && isTransparent(context))
			return canvas.toDataURL('image/png');
		return canvas.toDataURL('image/jpeg');
	};

	self.make = function() {

		bgcolor = self.attr('data-background');
		width = parseInt(self.attr('data-width') || 0);
		height = parseInt(self.attr('data-height') || 0);
		self.element.addClass('ui-crop');
		self.append('<input type="file" style="display:none" accept="image/*" /><ul><li data-type="upload"><span class="fa fa-folder"></span></li><li data-type="plus"><span class="fa fa-plus"></span></li><li data-type="refresh"><span class="fa fa-refresh"></span></li><li data-type="minus"><span class="fa fa-minus"></span></li></ul><div><span><b>{0}</b>x<b>{1}</b>px</span></div>'.format(width, height));
		self.append(Tangular.render('<canvas width="{{ width }}" height="{{ height }}"></canvas>', { width: width, height: height }));
		canvas = self.find('canvas').get(0);
		context = canvas.getContext('2d');

		self.element.on('click', 'li', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var count = parseInt();
			var type = $(this).attr('data-type');

			switch (type) {
				case 'upload':
					self.find('input').trigger('click');
					break;
				case 'plus':
					zoom += 5;
					if (zoom > 300)
						zoom = 300;
					current.x -= 5;
					current.y -= 5;
					self.redraw();
				break;
				case 'minus':
					zoom -= 5;
					if (zoom < 5)
						zoom = 5;
					current.x += 5;
					current.y += 5;
					self.redraw();
					break;
				case 'refresh':
					zoom = cache.zoom;
					x = cache.x;
					y = cache.y;
					self.redraw();
					break;
			}

		});

		self.find('input').on('change', function() {
			var file = this.files[0];
			var reader = new FileReader();

			reader.onload = function () {
				img.src = reader.result;
				setTimeout(function() {
					self.change();
				}, 500);
			};

			reader.readAsDataURL(file);
			this.value = '';
		});

		$(canvas).on('mousedown', function (e) {

			if (self.disabled || !can)
				return;

			is = true;
			var rect = canvas.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;
			offset.x = x - current.x;
			offset.y = y - current.y;
		});

		((self.attr('data-dragdrop') || 'true') === 'true') && $(canvas).on('dragenter dragover dragexit drop dragleave', function (e) {
			if (self.disabled)
				return;

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					self.element.removeClass('ui-crop-dragdrop');
					break;
				case 'dragenter':
				case 'dragover':
					self.element.addClass('ui-crop-dragdrop');
					return;
				case 'dragexit':
				case 'dragleave':
				default:
					self.element.removeClass('ui-crop-dragdrop');
					return;
			}

			var files = e.originalEvent.dataTransfer.files;
			var reader = new FileReader();

			reader.onload = function () {
				img.src = reader.result;
				setTimeout(function() {
					self.change();
				}, 500);
			};

			reader.readAsDataURL(files[0]);
		});

		self.element.on('mousemove mouseup', function (e) {

			if (e.type === 'mouseup') {
				is && self.change();
				is = false;
				return;
			}

			if (self.disabled || !can || !is)
				return;

			var rect = canvas.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;
			current.x = x - offset.x;
			current.y = y - offset.y;
			self.redraw();
		});
	};

	self.redraw = function() {

		var w = img.width;
		var h = img.height;

		w = ((w / 100) * zoom) >> 0;
		h = ((h / 100) * zoom) >> 0;

		context.clearRect(0, 0, width, height);

		if (bgcolor) {
			context.fillStyle = bgcolor;
			context.fillRect(0, 0, width, height)
		}

		can && context.drawImage(img, current.x || 0, current.y || 0, w, h);
	};

	self.setter = function(value) {

		if (value) {
			img.src = (self.attr('data-format') || '{0}').format(value);
			return;
		}

		can = false;
		self.redraw();
	};

	function isTransparent(ctx) {
		var id = ctx.getImageData(0, 0, width, height);
		for (var i = 0, length = id.data.length; i < length; i += 4)
			if (id.data[i + 3] !== 255) return true;
		return false;
	}
});

COMPONENT('codemirror', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var skipA = false;
	var skipB = false;
	var editor;
	var timeout;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.released = function(is) {
		is && editor.setValue('');
	};

	self.make = function() {

		var height = self.element.attr('data-height');
		var icon = self.element.attr('data-icon');
		var content = self.html();
		self.html('<div class="ui-codemirror-label' + (required ? ' ui-codemirror-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div><div class="ui-codemirror"></div>');

		var container = self.find('.ui-codemirror');
		editor = CodeMirror(container.get(0), { lineNumbers: self.attr('data-linenumbers') === 'true', mode: self.attr('data-type') || 'htmlmixed', indentUnit: 4 });
		height !== 'auto' && editor.setSize('100%', height || '200px');

		editor.on('change', function(a, b) {

			if (self.release())
				return;

			if (skipB && b.origin !== 'paste') {
				skipB = false;
				return;
			}

			setTimeout2(self.id, function() {
				skipA = true;
				self.reset(true);
				self.dirty(false);
				self.set(editor.getValue());
			}, 200);
		});

		skipB = true;
	};

	self.getter = null;
	self.setter = function(value, path) {

		if (skipA === true) {
			skipA = false;
			return;
		}

		skipB = true;
		editor.setValue(value || '');
		editor.refresh();
		skipB = true;

		CodeMirror.commands['selectAll'](editor);
		var f = editor.getCursor(true);
		var t = editor.getCursor(false);
		skipB = true;
		editor.setValue(editor.getValue());
		skipB = true;

		setTimeout(function() {
			editor.refresh();
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);
	};

	self.state = function(type) {
		self.element.find('.ui-codemirror').toggleClass('ui-codemirror-invalid', self.isInvalid());
	};
});

COMPONENT('calendar', function() {

	var self = this;
	var skip = false;
	var skipDay = false;
	var callback;

	self.days = self.attr('data-days').split(',');
	self.months = self.attr('data-months').split(',');
	self.first = parseInt(self.attr('data-firstday'));
	self.today = self.attr('data-today');
	self.months_short = [];

	for (var i = 0, length = self.months.length; i < length; i++) {
		var m = self.months[i];
		if (m.length > 4)
			m = m.substring(0, 3) + '.';
		self.months_short.push(m);
	}

	self.readonly();
	self.click = function(date) {};

	function getMonthDays(dt) {

		var m = dt.getMonth();
		var y = dt.getFullYear();

		if (m === -1) {
			m = 11;
			y--;
		}

		return (32 - new Date(y, m, 32).getDate());
	}

	function calculate(year, month, selected) {

		var d = new Date(year, month, 1);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = self.first;
		var firstCount = 0;
		var from = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (from < 0)
			from = 7 + from;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1)) - from;

		for (var i = 0; i < days + from; i++) {

			count++;
			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: count };

			if (i >= from) {
				index++;
				obj.number = index;
				obj.isSelected = sy === year && sm === month && sd === index;
				obj.isToday = ty === year && tm === month && td === index;
				obj.isFuture = ty < year;

				if (!obj.isFuture && year === ty) {
					if (tm < month)
						obj.isFuture = true;
					else if (tm === month)
						obj.isFuture = td < index;
				}

			} else {
				indexEmpty++;
				obj.number = prev + indexEmpty;
				obj.isEmpty = true;
			}

			output.days.push(obj);
		}

		indexEmpty = 0;
		for (var i = count; i < 42; i++) {
			count++;
			indexEmpty++;
			var obj = { isToday: false, isSelected: false, isEmpty: true, isFuture: false, number: indexEmpty, index: count };
			output.days.push(obj);
		}

		return output;
	}

	self.hide = function() {
		if (!self.element.hasClass('hidden'))
			self.element.addClass('hidden');
		return self;
	};

	self.toggle = function(el, value, callback, offset) {
		if (self.element.hasClass('hidden'))
			self.show(el, value, callback, offset);
		else
			self.hide();
		return self;
	};

	self.show = function(el, value, callback, offset) {

		if (!el)
			return self.hide();

		var off = el.offset();
		var h = el.innerHeight();

		self.element.css({ left: off.left + (offset || 0), top: off.top + h + 12 }).removeClass('hidden');
		self.click = callback;
		self.date(value);
		return self;
	};

	self.make = function() {

		self.element.addClass('ui-calendar hidden');

		self.element.on('click', '.ui-calendar-today', function() {
			var dt = new Date();
			self.hide();
			self.click && self.click(dt);
		});

		self.element.on('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
			skip = true;
			self.element.find('.ui-calendar-selected').removeClass('ui-calendar-selected');
			$(this).addClass('ui-calendar-selected');
			self.hide();
			self.click && self.click(dt);
		});

		self.element.on('click', 'button', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1);
			switch (this.name) {
				case 'prev':
					dt.setMonth(dt.getMonth() - 1);
					break;
				case 'next':
					dt.setMonth(dt.getMonth() + 1);
					break;
			}
			skipDay = true;
			self.date(dt);
		});

		$(document.body).on('scroll', function() {
			EXEC('$calendar.hide');
		});

		window.$calendar = self;
	};

	self.date = function(value) {

		if (typeof(value) === 'string')
			value = value.parseDate();

		var empty = !value;

		if (skipDay) {
			skipDay = false;
			empty = true;
		}

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			value = new Date();

		old = value;

		var output = calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			if (item.isEmpty)
				cls.push('ui-calendar-disabled');
			else
				cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push('ui-calendar-selected');
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="' + cls.join(' ') + '" data-date="' + output.year + '-' + output.month + '-' + item.number + '">' + item.number + '</td>');
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>' + output.header[i].name + '</th>');

		self.element.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="' + output.year + '-' + output.month + '"><span class="fa fa-chevron-left"></span></button><div class="ui-calendar-header-info">' + self.months[value.getMonth()] + ' ' + value.getFullYear() + '</div><button class="ui-calendar-header-next" name="next" data-date="' + output.year + '-' + output.month + '"><span class="fa fa-chevron-right"></span></button></div><table cellpadding="0" cellspacing="0" border="0"><thead>' + header.join('') + '</thead><tbody>' + builder.join('') + '</tbody></table>' + (self.today ? '<div><a href="javascript:void(0)" class="ui-calendar-today">' + self.today + '</a></div>' : ''));
	};
});

COMPONENT('tabmenu', function() {
	var self = this;
	self.readonly();
	self.make = function() {
		self.element.on('click', 'li', function() {
			var el = $(this);
			if (el.hasClass('selected'))
				return;
			self.set(self.parser(el.attr('data-value')));
		});
	};
	self.setter = function(value) {
		self.element.find('.selected').removeClass('selected');
		self.element.find('li[data-value="' + value + '"]').addClass('selected');
	};
});

COMPONENT('disable', function() {
	var self = this;
	var condition = self.attr('data-if');
	var selector = self.attr('data-selector') || 'input,texarea,select';

	self.readonly();

	self.setter = function(value) {
		var is = true;

		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? false : true;

		self.find(selector).each(function() {
			var el = $(this);
			var tag = el.get(0).tagName;
			if (tag === 'INPUT' || tag === 'SELECT') {
				el.prop('disabled', is);
				el.parent().parent().toggleClass('ui-disabled', is);
				return;
			}
			el.toggleClass('ui-disabled', is);
		});
	};

	self.state = function(type) {
		self.update();
	};
});

COMPONENT('confirm', function() {
	var self = this;
	var is = false;
	var visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.toggle('ui-confirm hidden', true);
		self.element.on('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.element.on('click', function(e) {
			if (e.target.tagName !== 'DIV')
				return;
			var el = self.element.find('.ui-confirm-body');
			el.addClass('ui-confirm-click');
			setTimeout(function() {
				el.removeClass('ui-confirm-click');
			}, 300);
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.element.removeClass('ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		visible = true;
		self.element.find('.ui-confirm-body').empty().append(text);
		self.element.removeClass('hidden');
		setTimeout2(self.id, function() {
			self.element.addClass('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-loading');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.element.toggleClass('hidden', false);
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.element.toggleClass('hidden', true);
		}, timeout || 1);
		return self;
	};
});

COMPONENT('pagination', function() {

	var self = this;
	var nav;
	var info;
	var cachePages = 0;
	var cacheCount = 0;

	self.template = Tangular.compile('<a href="#page{{ page }}" class="page{{ if selected }} selected{{ fi }}" data-page="{{ page }}">{{ page }}</a>');
	self.readonly();
	self.make = function() {
		self.element.addClass('ui-pagination hidden');
		self.append('<div></div><nav></nav>');
		nav = self.find('nav');
		info = self.find('div');
		self.element.on('click', 'a', function(e) {
			e.preventDefault();
			e.stopPropagation();
			var el = $(this);
			if (self.onPage)
				self.onPage(el.attr('data-page').parseInt(), el);
		});
	};

	self.onPage = function(page) {
		self.set(self.attr('data-target-path'), page);
	};

	self.getPagination = function(page, pages, max, fn) {

		var half = Math.ceil(max / 2);
		var pageFrom = page - half;
		var pageTo = page + half;
		var plus = 0;

		if (pageFrom <= 0) {
			plus = Math.abs(pageFrom);
			pageFrom = 1;
			pageTo += plus;
		}

		if (pageTo >= pages) {
			pageTo = pages;
			pageFrom = pages - max;
		}

		if (pageFrom <= 0)
			pageFrom = 1;

		if (page < half + 1) {
			pageTo++;
			if (pageTo > pages)
				pageTo--;
		}

		for (var i = pageFrom; i < pageTo + 1; i++)
			fn(i);
	};

	self.getPages = function(length, max) {
		var pages = (length - 1) / max;
		if (pages % max !== 0)
			pages = Math.floor(pages) + 1;
		if (pages === 0)
			pages = 1;
		return pages;
	};

	self.setter = function(value) {

		// value.page   --> current page index
		// value.pages  --> count of pages
		// value.count  --> count of items in DB

		var is = false;

		if (value.pages !== undefined) {
			if (value.pages !== cachePages || value.count !== cacheCount) {
				cachePages = value.pages;
				cacheCount = value.count;
				is = true;
			}
		}

		var builder = [];

		if (cachePages > 2) {
			var prev = value.page - 1;
			if (prev <= 0)
				prev = cachePages;
			builder.push('<a href="#prev" class="page" data-page="{0}"><span class="fa fa-arrow-left"></span></a>'.format(prev));
		}

		var max = self.attr('data-max');
		if (max)
			max = max.parseInt();
		else
			max = 8;

		self.getPagination(value.page, cachePages, max, function(index) {
			builder.push(self.template({ page: index, selected: value.page === index }));
		});

		if (cachePages > 2) {
			var next = value.page + 1;
			if (next > cachePages)
				next = 1;
			builder.push('<a href="#next" class="page" data-page="{0}"><span class="fa fa-arrow-right"></span></a>'.format(next));
		}

		nav.empty().append(builder.join(''));

		if (!is)
			return;

		if (cachePages > 1) {
			var pluralize_pages = [cachePages];
			var pluralize_items = [cacheCount];

			pluralize_pages.push.apply(pluralize_pages, self.attr('data-pages').split(',').trim());
			pluralize_items.push.apply(pluralize_items, self.attr('data-items').split(',').trim());

			info.empty().append(Tangular.helpers.pluralize.apply(value, pluralize_pages) + ' / ' + Tangular.helpers.pluralize.apply(value, pluralize_items));
			self.element.toggleClass('hidden', false);
		} else
			self.element.toggleClass('hidden', true);
	};
});

COMPONENT('autocomplete', function() {
	var self = this;
	var container;
	var old;
	var onSearch;
	var searchtimeout;
	var searchvalue;
	var blurtimeout;
	var onCallback;
	var datasource;
	var is = false;
	var margin = {};

	self.template = Tangular.compile('<li{{ if index === 0 }} class="selected"{{ fi }} data-index="{{ index }}"><span>{{ name | raw }}</span><span>{{ type }}</span></li>');
	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-autocomplete-container');
		self.element.html('<div class="ui-autocomplete"><ul></ul></div>');
		container = self.element.find('ul');

		self.element.on('click', 'li', function(e) {
			e.preventDefault();
			e.stopPropagation();
			onCallback && onCallback(datasource[+$(this).attr('data-index')], old);
			self.visible(false);
		});

		self.element.on('mouseenter mouseleave', 'li', function(e) {
			$(this).toggleClass('selected', e.type === 'mouseenter');
		});

		$(document).on('click', function(e) {
			is && self.visible(false);
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	function keydown(e) {
		var c = e.keyCode;
		var input = this;

		if (c !== 38 && c !== 40 && c !== 13) {
			if (c !== 8 && c < 32)
				return;
			clearTimeout(searchtimeout);
			searchtimeout = setTimeout(function() {
				var val = input.value;
				if (!val)
					return self.render(EMPTYARRAY);
				if (searchvalue === val)
					return;
				searchvalue = val;
				self.resize();
				onSearch(val, function(value) { self.render(value); });
			}, 200);
			return;
		}

		var current = self.element.find('.selected');

		if (c === 13) {
			self.visible(false);
			if (!current.length)
				return;
			onCallback(datasource[+current.attr('data-index')], old);
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (current.length) {
			current.removeClass('selected');
			current = c === 40 ? current.next() : current.prev();
		}

		if (!current.length)
			current = self.element.find('li:{0}-child'.format(c === 40 ? 'first' : 'last'));
		current.addClass('selected');
	}

	function blur() {
		clearTimeout(blurtimeout);
		blurtimeout = setTimeout(function() {
			self.visible(false);
		}, 300);
	}

	self.visible = function(visible) {
		clearTimeout(blurtimeout);
		self.element.toggleClass('hidden', !visible);
		is = visible;
	};

	self.resize = function() {

		if (!old)
			return;

		var offset = old.offset();
		offset.top += old.height();
		offset.width = old.width();

		if (margin.left)
			offset.left += margin.left;
		if (margin.top)
			offset.top += margin.top;
		if (margin.width)
			offset.width += margin.width;

		self.element.css(offset);
	};

	self.attach = function(input, search, callback, top, left, width) {

		clearTimeout(searchtimeout);

		if (input.setter)
			input = input.find('input');
		else
			input = $(input);

		if (old) {
			old.removeAttr('autocomplete');
			old.off('blur', blur);
			old.off('keydown', keydown);
		}

		input.on('keydown', keydown);
		input.on('blur', blur);
		input.attr({ 'autocomplete': 'off' });

		old = input;
		margin.left = left;
		margin.top = top;
		margin.width = width;

		self.resize();
		self.refresh();
		searchvalue = '';
		onSearch = search;
		onCallback = callback;
		self.visible(false);
	};

	self.render = function(arr) {

		datasource = arr;

		if (!arr || !arr.length) {
			self.visible(false);
			return;
		}

		var builder = [];
		for (var i = 0, length = arr.length; i < length; i++) {
			var obj = arr[i];
			obj.index = i;
			builder.push(self.template(obj));
		}

		container.empty().append(builder.join(''));
		self.visible(true);
	};
});

COMPONENT('contextmenu', function() {
	var self = this;
	var $window = $(window);
	var is = false;
	var timeout;
	var container;
	var arrow;

	self.template = Tangular.compile('<div data-value="{{ value }}"{{ if selected }} class="selected"{{ fi }}><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.callback = null;

	self.make = function() {

		self.element.addClass('ui-contextmenu');
		self.element.append('<span class="ui-contextmenu-arrow fa fa-caret-up"></span><div class="ui-contextmenu-items"></div>');
		container = self.element.find('.ui-contextmenu-items');
		arrow = self.element.find('.ui-contextmenu-arrow');

		self.element.on('touchstart mousedown', 'div[data-value]', function(e) {
			self.callback && self.callback($(this).attr('data-value'), $(self.target));
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function(e) {
			FIND('contextmenu').hide();
		});
	};

	self.show = function(orientation, target, items, callback, left, top) {

		if (is) {
			clearTimeout(timeout);
			var obj = target instanceof jQuery ? target.get(0) : target;
			if (self.target === obj) {
				self.hide(0);
				return;
			}
		}

		target = $(target);
		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);
		else if (type === 'function') {
			callback = items;
			items = (target.attr('data-options') || '').split(';');
			for (var i = 0, length = items.length; i < length; i++) {
				item = items[i];
				if (!item)
					continue;
				var val = item.split('|');
				items[i] = { name: val[0], icon: val[1], value: val[2] || val[0] };
			}
		}

		if (!items) {
			self.hide(0);
			return;
		}

		self.callback = callback;

		var builder = [];
		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];
			item.index = i;
			if (!item.value)
				item.value = item.name;
			if (!item.icon)
				item.icon = 'fa-caret-right';
			builder.push(self.template(item));
		}

		self.target = target.get(0);
		var offset = target.offset();

		container.html(builder);

		switch (orientation) {
			case 'left':
				arrow.css({ left: '15px' });
				break;
			case 'right':
				arrow.css({ left: '170px' });
				break;
			case 'center':
				arrow.css({ left: '107px' });
				break;
		}

		if (!left)
			left = 0;
		if (!top)
			top = 0;

		var options = { left: orientation === 'center' ? Math.ceil((offset.left - self.element.width() / 2) + (target.innerWidth() / 2) + left) : orientation === 'left' ? offset.left - 8 : (offset.left - self.element.width() + left) + target.innerWidth(), top: offset.top + top + target.innerHeight() + 10 };
		self.element.css(options);

		if (is)
			return;

		self.element.show();
		setTimeout(function() {
			self.element.addClass('ui-contextmenu-visible');
            self.emit('contextmenu', true, self, self.target);
		}, 100);

		is = true;
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.element.hide().removeClass('ui-contextmenu-visible');
            self.emit('contextmenu', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('checkboxlist', function() {
	var self = this;
	var template = Tangular.compile('<div class="ui-checkboxlist-checkbox {0}" data-search="{{ name }}"><label><input type="checkbox" value="{{ id }}"><span>{{ name }}</span></label></div>'.format(self.attr('data-class')));
	var datasource;
	var items;
	var condition;

	self.make = function() {

		self.element.on('click', 'input', function() {
			var arr = self.get();

			if (!(arr instanceof Array))
				arr = [];

			var value = self.parser(this.value);
			var index = arr.indexOf(value);
			if (index === -1)
				arr.push(value);
			else
				arr.splice(index, 1);

			self.set(arr);
			setTimeout2(self.id, function() {
				self.change(true);
			}, 400);
		});

		self.element.on('click', 'a', function() {
			var arr = [];
			var inputs = self.element.find('input');
			var value = self.get();

			if (value && inputs.length === value.length) {
				self.set(arr);
				return;
			}

			inputs.each(function() {
				arr.push(self.parser(this.value));
			});

			self.set(arr);
			setTimeout2(self.id, function() {
				self.change(true);
			}, 400);
		});

		self.make = function() {

			var options = self.attr('data-options');
			if (!options)
				return;

			var arr = options.split(';');
			var datasource = [];

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i].split('|');
				datasource.push({ id: item[1] === undefined ? item[0] : item[1], name: item[0] });
			}

			self.redraw(datasource);
		};

		self.setter = function(value) {
			self.element.find('input').each(function() {
				this.checked = value && value.indexOf(self.parser(this.value)) !== -1;
			});
		};

		self.redraw = function(arr) {
			var builder = [];
			var kn = self.attr('data-source-text') || 'name';
			var kv = self.attr('data-source-value') || 'id';

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];

				if (condition && !condition(item))
					continue;

				if (typeof(item) === 'string')
					builder.push(template({ id: item, name: item }));
				else
					builder.push(template({ id: item[kv] === undefined ? item[kn] : item[kv], name: item[kn] }));
			}

			if (!builder.length)
				return;

			self.attr('data-button') && builder.push('<div class="clearfix"></div><div class="{1}"><div class="ui-checkboxlist-selectall"><a href="javascript:void(0)"><i class="fa fa-check-square mr5"></i>{0}</a></div></div>'.format(self.attr('data-button'), self.attr('data-class')));
			self.html(builder.join(''));
			self.setter(self.get());
			return self;
		};

		condition = self.attr('data-if');
		if (condition)
			condition = FN(condition);

		datasource = self.attr('data-source');
		datasource && self.watch(datasource, function(path, value) {
			if (self.release())
				return;
			items = value || EMPTYARRAY;
			self.redraw(value);
		});
	};

	self.released = function(is) {

		if (is) {
			self.empty();
			items = null;
			return;
		}

		var tmp = self.get(datasource) || EMPTYARRAY;
		if (tmp === items)
			return;
		items = tmp;
		self.redraw(items);
	};
});
// ==========================================================
// @{end}
// ==========================================================

COMPONENT('search', function() {

	var self = this;
	var options_class;
	var options_selector;
	var options_attribute;
	var options_delay;

	self.readonly();
	self.make = function() {
		options_class = self.attr('data-class') || 'hidden';
		options_selector = self.attr('data-selector');
		options_attribute = self.attr('data-attribute') || 'data-search';
		options_delay = (self.attr('data-delay') || '200').parseInt();
	};

	self.setter = function(value) {

		if (!options_selector || !options_attribute)
			return;

		KEYPRESS(function() {

			var elements = self.element.find(options_selector);

			if (!value) {
				elements.removeClass(options_class);
				return;
			}

			var search = value.toLowerCase().replace(/y/gi, 'i');

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(options_attribute) || '').toLowerCase().replace(/y/gi, 'i');
				el.toggleClass(options_class, val.indexOf(search) === -1);
				setTimeout(next, 3);
			});

		}, options_delay, 'search' + self.id);
	};
});

jC.parser(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value;

		if (!value)
			return null;

		var isEN = value.indexOf('.') === -1;
		var tmp = isEN ? value.split('-') : value.split('.');
		if (tmp.length !== 3)
			return null;
		var dt = isEN ? new Date(parseInt(tmp[0]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[2], 10) || 0) : new Date(parseInt(tmp[2]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[0], 10) || 0);
		return dt;
	}

	return value;
});

jC.formatter(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value.format(this.attr('data-component-format'));
		if (!value)
			return value;
		return new Date(Date.parse(value)).format(this.attr('data-component-format'));
	}

	if (type !== 'currency')
		return value;

	if (typeof(value) !== 'number') {
		value = parseFloat(value);
		if (isNaN(value))
			value = 0;
	}

	return value.format(2);
});
