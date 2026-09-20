// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Nikitid
'use strict';

// shared.js was stubbed out by every other JS test, so nothing ever evaluated
// it. That hid a page-breaking regression: styles() returned an empty string,
// and LuCI's E() falls through to document.createElement() for anything that is
// neither a node nor markup, so every view raised InvalidCharacterError.
//
// The E() dispatch below mirrors luci.js so this test fails the same way the
// browser did.

const assert = require('assert');
const fsNode = require('fs');

let createdTags = [];

class Node {
	constructor(nodeType, tag) {
		this.nodeType = nodeType;
		this.tagName = tag;
		this.childNodes = [];
		this.attributes = {};
		this.id = '';
		this.dataset = {};
		this.disabled = false;
	}
	appendChild(child) {
		if (child == null || typeof child !== 'object' || !('nodeType' in child))
			throw new TypeError('appendChild expects a node');
		// A document fragment contributes its children and then itself is empty.
		if (child.nodeType === 11) {
			child.childNodes.forEach(item => this.childNodes.push(item));
			child.childNodes = [];
			return child;
		}
		this.childNodes.push(child);
		return child;
	}
	setAttribute(name, value) {
		this.attributes[name] = value;
		if (name === 'id')
			this.id = value;
	}
	removeAttribute(name) {
		delete this.attributes[name];
	}
	get textContent() {
		return this.childNodes.map(item =>
			typeof item === 'string' ? item : item.textContent).join('');
	}
	set textContent(value) {
		this.childNodes = [ String(value) ];
	}
	get innerHTML() {
		return this.childNodes.map(item =>
			typeof item === 'string' ? item : item.textContent).join('');
	}
	set innerHTML(value) {
		this.childNodes = [ String(value) ];
	}
}

const document = {
	head: new Node(1, 'head'),
	byId: {},
	createElement(tag) {
		createdTags.push(tag);
		// The real DOM raises this for an empty or otherwise invalid tag name.
		if (typeof tag !== 'string' || !/^[A-Za-z][A-Za-z0-9-]*$/.test(tag))
			throw new Error('InvalidCharacterError: The string contains invalid characters.');
		return new Node(1, tag);
	},
	createDocumentFragment() {
		return new Node(11, null);
	},
	createTextNode(value) {
		const node = new Node(3, null);
		node.value = String(value);
		Object.defineProperty(node, 'textContent', { get: () => node.value });
		return node;
	},
	getElementById(id) {
		return document.byId[id] || null;
	},
	querySelectorAll() {
		return [];
	}
};

function isNode(value) {
	return value != null && typeof value === 'object' && 'nodeType' in value;
}

// Mirrors the dispatch in luci.js: array -> fragment, node -> as is,
// string starting with '<' -> parsed markup, anything else -> createElement.
function E(html, attr, data) {
	let elem;
	if (!(attr instanceof Object) || Array.isArray(attr)) {
		data = attr;
		attr = null;
	}
	if (Array.isArray(html)) {
		elem = document.createDocumentFragment();
		html.forEach(item => elem.appendChild(E(item)));
	}
	else if (isNode(html)) {
		elem = html;
	}
	else if (typeof html === 'string' && html.charCodeAt(0) === 60) {
		elem = new Node(1, 'parsed');
	}
	else {
		elem = document.createElement(html);
	}
	if (attr)
		Object.keys(attr).forEach(name => {
			if (attr[name] != null)
				elem.setAttribute(name, attr[name]);
		});
	if (data != null) {
		const items = Array.isArray(data) ? data : [ data ];
		items.forEach(item => {
			if (item == null || item === '')
				return;
			elem.appendChild(isNode(item) ? item : document.createTextNode(item));
		});
	}
	if (elem.id)
		document.byId[elem.id] = elem;
	return elem;
}

// LuCI installs this on String.prototype; shared.js relies on it.
if (!String.prototype.format)
	String.prototype.format = function() {
		const args = Array.prototype.slice.call(arguments);
		return this.replace(/%[sd]/g, () => String(args.shift()));
	};

const nativeTranslate = value => 'native:' + value;
const windowStub = {
	_: nativeTranslate,
	navigator: { language: 'en-US' },
	localStorage: { getItem: () => null, setItem: () => {} },
	setTimeout: () => {}
};

const baseclass = { extend: object => object };
const fs = {};

const source = fsNode.readFileSync('luci-ikev2-manager/shared.js', 'utf8');
const factory = new Function(
	'window', 'document', 'L', 'baseclass', 'fs', 'E', source);
const common = factory(windowStub, document, {}, baseclass, fs, E);

// The regression: whatever styles() returns is placed among E() children.
createdTags = [];
const first = common.styles();
assert(isNode(first), 'styles() must return something LuCI.dom.elem() accepts');
assert(!createdTags.includes(''),
	'styles() caused document.createElement("")');

// Passing it through E() the way every view does must not throw.
assert.doesNotThrow(() => E([ first, E('div', {}, [ 'x' ]) ]),
	'the styles() result is not accepted as an E() child');

// The stylesheet is installed once per document, not rebuilt on every render.
const injected = document.head.childNodes.filter(node => node.tagName === 'style');
assert.strictEqual(injected.length, 1, 'the stylesheet was not installed');
common.styles();
common.styles();
assert.strictEqual(
	document.head.childNodes.filter(node => node.tagName === 'style').length, 1,
	'the stylesheet was installed more than once');

// The project translator must stay local: replacing window._ applies the
// project map to every other application on shared pages such as Status
// Overview.
assert.strictEqual(windowStub._, nativeTranslate,
	'shared.js replaced the global translation function');
assert.strictEqual(typeof common.t, 'function', 'common.t is not exported');
assert.strictEqual(common.t('Overview'), 'نمای کلی',
	'the Persian default translation is not applied');
assert.strictEqual(common.t('Update lists now'), 'به‌روز رسانی لیست‌ها');
assert.strictEqual(common.t('Restarting policy routing...'),
	'در حال راه‌اندازی دوبارهٔ مسیریابی...');
assert.strictEqual(common.t('List refresh failed: the selected lists could not be rebuilt; previous lists and policy preserved'),
	'به‌روزرسانی فهرست‌ها ناموفق بود؛ فهرست‌ها و تنظیمات مسیریابی قبلی حفظ شدند.');
assert.ok(!common.t('Prepared and user-created services stay in separate lists. Chips stage policy selection; the page Save button applies it. Service definitions are managed independently.').includes('چیپس'));
assert.strictEqual(common.t('Disconnect all'), 'اتصال‌های فعال را قطع کن');
assert.ok(/disconnect-all\)[\s\S]{0,100}swanctl_quiet --terminate/.test(
	fsNode.readFileSync('luci-ikev2-manager/ikev2-manager.sh', 'utf8')),
	'the disconnect label must describe terminating active sessions, not revoking users');
assert.strictEqual(common.t('Passwords are write-only. Set a new password if one is lost; router backups still contain secrets.'),
	'رمزهای ذخیره‌شده در این صفحه نمایش داده نمی‌شوند. اگر رمزی را فراموش کردی، برای همان کاربر رمز تازه‌ای تنظیم کن. نسخهٔ پشتیبان روتر همچنان ممکن است حاوی رمزها باشد.');
assert.ok(common.t('Capture a short, separate strongSwan trace while the affected client tries to connect. The capture stops automatically and does not increase system-log verbosity.').includes('strongSwan'));
assert.strictEqual(common.t('Capture a short, separate strongSwan trace while the affected client tries to connect. The capture stops automatically and does not increase system-log verbosity.'),
	'هنگام تلاش کاربر برای اتصال، گزارش کوتاه و جداگانه‌ای از strongSwan بگیر. ثبت گزارش پس از ۶۰ ثانیه خودکار متوقف می‌شود و سطح گزارش‌نویسی سیستم را تغییر نمی‌دهد.');
assert.ok(!/قوی سوان|قوی قو|چیپس|فقط خواندنی/.test(source),
	'misleading machine-translated Persian copy reappeared');
for (const filename of [
	'ikev2-manager-runtime/ikev2-manager-system.sh',
	'luci-ikev2-domains/community-domains.sh'
]) {
	const backend = fsNode.readFileSync(filename, 'utf8');
	const messages = backend.matchAll(
		/(?:deps_status\s+(?:running|error|ok)|write_simple_status\s+"\$action_id"\s+(?:running|error))\s+'([^']+)'/g);
	for (const match of messages)
		assert.ok(!common.t(match[1]).startsWith('native:'),
			'Persian backend status missing: ' + match[1]);
}
const communityBackend = fsNode.readFileSync('luci-ikev2-domains/community-domains.sh', 'utf8');
for (const match of communityBackend.matchAll(/apply_failed '([^']+)'/g))
	assert.ok(!common.t(match[1]).startsWith('native:'),
		'Persian list-rebuild reason missing: ' + match[1]);
const managerBackend = fsNode.readFileSync('luci-ikev2-manager/ikev2-manager.sh', 'utf8');
for (const match of managerBackend.matchAll(/action_status "\$id" (?:running|error|ok) '([^']+)'/g))
	assert.ok(!common.t(match[1]).startsWith('native:'),
		'Persian router-action status missing: ' + match[1]);
const systemBackend = fsNode.readFileSync('ikev2-manager-runtime/ikev2-manager-system.sh', 'utf8');
for (const match of systemBackend.matchAll(/action_status "\$id" (?:running|error|ok) '([^']+)'/g))
	assert.ok(!common.t(match[1]).startsWith('native:'),
		'Persian system-action status missing: ' + match[1]);
assert.strictEqual(common.t('Applying and verifying device routing...'),
	'در حال اعمال و بررسی مسیر ترافیک دستگاه...');
assert.ok(common.t('Tunnel did not come up: connection refused').startsWith('تونل برقرار نشد:'));
assert.ok(common.t('Settings were saved, but the tunnel did not come up: connection refused')
	.startsWith('تنظیمات ذخیره شد، اما تونل برقرار نشد:'));
assert.strictEqual(common.t('List refresh failed: the selected lists could not be rebuilt; previous lists and policy preserved'),
	'به‌روزرسانی فهرست‌ها ناموفق بود؛ فهرست‌ها و تنظیمات مسیریابی قبلی حفظ شدند.');
assert.ok(common.t('Service update failed: invalid service identifier; previous service, selection and policy preserved')
	.includes('شناسهٔ سرویس معتبر نیست'));
assert.ok(common.t('OpenWrt 24.10.x with opkg or 25.12.x with apk is required; found 23.05.5 with opkg')
	.includes('23.05.5'));
assert.ok(source.includes("var STYLE_ID = 'ikev2-manager-styles-v6';"));
assert.ok(/html\[dir="rtl"\] \.ikev2-form-grid\s*\{[^}]*grid-template-columns:\s*minmax\(13rem, 24rem\) minmax\(0, 1fr\)/.test(source),
	'RTL form grid must place labels in the right-hand column');
assert.ok(!/html\[dir="rtl"\] \.ikev2-form-grid > :not\(\.ikev2-field-label\)\s*\{[^}]*grid-column/.test(source),
	'RTL form controls use forced columns and move to the next row');
assert.ok(/@media \(max-width: 600px\)[\s\S]*html\[dir="rtl"\] \.ikev2-form-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/.test(source),
	'RTL form fields do not collapse to one column on narrow screens');
assert.strictEqual(common.t('Use global setting'), 'طبق تنظیمات عمومی');
assert.strictEqual(common.t('Use project PBR policy'), 'طبق PBR برنامه');
assert.strictEqual(common.t('Remote gateway'), 'گیت‌وی از راه دور');
assert.ok(!source.includes('window.setTimeout(localizeNav'),
	'page navigation still changes tab labels after the first paint');

// Spot-check a couple of exported helpers actually run.
assert.strictEqual(common.formatBytes(0), '0 B');
assert.strictEqual(typeof common.pill('x', 'good'), 'object');

// Busy state may wrap buttons, checkboxes and selects. Non-button controls
// must retain their contents and current value while disabled.
const select = E('select', {}, [ E('option', {}, [ 'Warnings' ]), E('option', {}, [ 'Debug' ]) ]);
select.value = 'debug';
const selectMarkup = select.innerHTML;
common.setBusy(select, true, 'Applying...');
assert.strictEqual(select.innerHTML, selectMarkup, 'setBusy erased select options');
assert.strictEqual(select.value, 'debug', 'setBusy changed select value');
assert.strictEqual(select.disabled, true, 'setBusy did not disable select');
common.setBusy(select, false);
assert.strictEqual(select.innerHTML, selectMarkup, 'setBusy did not preserve select options');
assert.strictEqual(select.value, 'debug', 'setBusy did not preserve select value');
assert.strictEqual(select.disabled, false, 'setBusy did not restore select state');

// rpcd hands a session its grants when the session is created, so a page left
// open across an upgrade that adds a helper call keeps the older set and the
// call is refused. Surfacing rpcd's bare wording reads as a bug in the app;
// the message has to name the cause and what clears it.
(async () => {
	const captured = [];
	const sink = {
		busy() {}, ok() {},
		err(text) { captured.push(text); }
	};
	await common.runAction({
		result: sink,
		run() { throw new Error('Permission denied'); }
	});
	assert.strictEqual(captured.length, 1, 'runAction did not report the failure');
	assert.ok(/rpcd/i.test(captured[0]),
		'a permission denial is still reported as rpcd words it: ' + captured[0]);
	assert.ok(captured[0].length > 'Permission denied'.length,
		'the permission message says nothing beyond the refusal: ' + captured[0]);

	captured.length = 0;
	await common.runAction({
		result: sink,
		run() { throw new Error('Invalid DNS upstream'); }
	});
	assert.strictEqual(captured[0], 'Invalid DNS upstream',
		'an ordinary failure was rewritten as a permission problem');

	// The result line is where a failure explains itself. Clipping it to one
	// line turns the messages that say what to do into a fragment.
	const styles = fsNode.readFileSync('luci-ikev2-manager/shared.js', 'utf8');
	const resultRule = styles.slice(styles.indexOf('\n\t\t\t.ikev2-result {'),
		styles.indexOf('.ikev2-result.busy'));
	assert.ok(!/white-space:\s*nowrap/.test(resultRule),
		'the result line is clipped to one line again');
	assert.ok(!/text-overflow:\s*ellipsis/.test(resultRule),
		'the result line still truncates with an ellipsis');

	console.log('luci shared module tests OK');
})();
