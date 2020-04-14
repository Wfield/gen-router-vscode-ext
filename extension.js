const vscode = require('vscode');
const fs = require('fs');

function compose() {
	const fns = [].slice.call(arguments);
	return function(init) {
		let res = init;
		for(let i = fns.length - 1; i >= 0; i--) {
			res = fns[i](res);
		}
		return res;
	}
}

function removeKey (r) {
	if(!Array.isArray(r)) throw new Error('not an array');
	return r.map(item => {
		let t = {...item};
		if(t.hasOwnProperty('key')) {
			delete t.key;
		}
		if(Array.isArray(t.components)) {
			t.components = removeKey(t.components);
		}
		return t;
	});
}

function removePub (r) {
	if(!Array.isArray(r)) throw new Error('not an array');
	return r.map(item => {
		let t = {...item};
		if(/^\/pub/.test(t.path)) {
			t.path = t.path.replace('/pub', '');
		}
		if(Array.isArray(t.components)) {
			t.components = removePub(t.components);
		}
		return t
	});
}

function removeSameRouter (r) {
	if(!Array.isArray(r)) throw new Error('not an array');
	let iterated = [];
	let filterdRouter = [];
	r.forEach(item => {
		if(!iterated.includes(item.path)) {
			filterdRouter.push(item);
			iterated.push(item.path);
		}
	});
	return filterdRouter;
}

function addPub (r) {
	if(!Array.isArray(r)) throw new Error('not an array');
	return r.map(item => {
		let t = {...item};
		t.path = '/pub' + t.path;
		if(Array.isArray(t.components)) {
			t.components = addPub(t.components);
		}
		return t
	});
}

function addKeyAndAuth (r) {
	if(!Array.isArray(r)) throw new Error('not an array');
	return r.map(item => {
		let t = {...item};
		if(!t.hasOwnProperty('authorized')) {
			t.authorized = true;
		}
		if(!t.hasOwnProperty('key')) {
			t.key = t.path;
		}
		if(Array.isArray(t.components)) {
			t.components = addKeyAndAuth(t.components);
		}
		return t;
	})
}

function stringRouter (r) {
	return JSON.stringify(r, null, '\t');
}

function withoutQuote (r) {
	const reg = /\"(\w+)\":/igm;
	return r.replace(reg, '$1' + ':');
}

function toSingleQuote (r) {
	const reg = /\"/gm;
	return r.replace(reg, "'");
}

function addExportStr (r) {
	return 'module.exports = ' + r;
}


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('gen-pub-router.gen', function () {

		let editor = vscode.window.activeTextEditor;
		try {
			if(editor) {
				let document = editor.document;
				let router = require(document.fileName);
				let toStringRouter = compose(addExportStr, toSingleQuote, withoutQuote, stringRouter);
				let withPubRouterFn = compose(addKeyAndAuth, addPub);
				let withoutPubRouterFn = compose(removeSameRouter, removePub, removeKey);
				let withoutPubRouter = withoutPubRouterFn(router);
				let withPubRouter = withPubRouterFn(withoutPubRouter);
				let allRouter = withoutPubRouter.concat(withPubRouter);
				let routerStr = toStringRouter(allRouter);
				fs.writeFile(document.fileName, routerStr, 'utf8', (err) => {
					if(err) throw err;
					vscode.window.showInformationMessage('已完成');
				})
			}
		} catch (e) {
			vscode.window.showErrorMessage('生成路由失败');
		}
	});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
