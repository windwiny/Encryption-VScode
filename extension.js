// @ts-check

const vscode = require('vscode');
const CryptoJS = require("crypto-js");

/**
 * @param {(t:string)=>string} f 
 */
function changeText(f) {
	let replace = 0
	let error = 0
	let empty = 0

	if (!vscode.window.activeTextEditor) {
		return { sels: 'N/A', replace, error, empty };
	}

	let e = vscode.window.activeTextEditor;
	let d = e.document;
	let sel = e.selections;

	if (sel.length == 1 && sel[0].isEmpty) {
		const endpos = new vscode.Position(e.document.lineCount + 1, 0);
		const sel0 = new vscode.Range(new vscode.Position(0, 0), endpos);
		const txt = e.document.getText(sel0);
		e.edit(edit => {
			try {
				const txt2 = f(txt)
				if (txt2) {
					edit.replace(sel0, txt2);
					replace++
				} else
					empty++
			} catch (e) {
				console.error(e);
				error++
			}
		})
		return { sels: sel.length, replace, error, empty }
	}

	e.edit(function (edit) {
		for (var x = 0; x < sel.length; x++) {
			if (sel[x].isEmpty) continue
			const txt = d.getText(new vscode.Range(sel[x].start, sel[x].end));
			try {
				const txt2 = f(txt)
				if (txt2) {
					edit.replace(sel[x], txt2);
					replace++
				} else
					empty++
			} catch (e) {
				console.error(e);
				error++
			}
		}
	});
	return { sels: sel.length, replace, error, empty }
}

/**
 * @param {vscode.ExtensionContext} context
 */
const activate = (context) => {
	const encryptFunc = vscode.commands.registerCommand('extension.encrypt', async () => {
		const passString = await vscode.window.showInputBox({ prompt: 'Provide your passphrase', placeHolder: 'My passphrase', password: true, validateInput: value => (value.length == 0) ? "Passphrase cannot be empty" : null });

		/**
		 * @param {string} plainText 
		 * @returns string  openssl enc -aes-256-cbc -md md5 -base64 
		 */
		function enc(plainText) {
			if (!passString)
				return ''
			const cipherText = CryptoJS.AES.encrypt(plainText, passString).toString();
			return cipherText
		}

		let r = changeText(enc)
		vscode.window.showInformationMessage(`Sel "sels:${r.sels} rep:${r.replace}, get empty:${r.empty} err:${r.error}" Encrypted`);
	});
	context.subscriptions.push(encryptFunc);

	const decryptFunc = vscode.commands.registerCommand('extension.decrypt', async () => {
		const passString = await vscode.window.showInputBox({ prompt: 'Provide your passphrase', placeHolder: 'My passphrase', password: true, validateInput: value => (value.length == 0) ? "Passphrase cannot be empty" : null });

		/**
		 * @param {string} cipherText 
		 * @returns string  openssl enc -d -aes-256-cbc -md md5 -base64 
		 */
		function dec(cipherText) {
			if (!passString)
				return ''
			const bytes = CryptoJS.AES.decrypt(cipherText, passString);
			const plainText = bytes.toString(CryptoJS.enc.Utf8);
			return plainText
		}

		let r = changeText(dec)
		let msg = `sel "sels:${r.sels} rep:${r.replace}, get empty:${r.empty} err:${r.error}" Decrypted`;
		if(r.replace==0)
			vscode.window.showWarningMessage(msg);
		else
			vscode.window.showInformationMessage(msg);
	});
	context.subscriptions.push(decryptFunc);
}

exports.activate = activate;

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
