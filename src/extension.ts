import { fstat } from 'fs';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { relative } from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cmakesourcemanagerextension" is now active!');

	var createListener = function (event: vscode.FileCreateEvent) {
		if (vscode.workspace.workspaceFolders) {
			event.files.forEach((file) => {
				vscode.workspace.findFiles("CMakeLists.txt").then((files) => {
					if (files.length != 0) {
						let filename = getLastPartOfPath(file.fsPath);
						if (filename == 'CMakeLists.txt') return;
						//console.log("File: " + filename + " was created!");

						vscode.window.showInformationMessage("Would you like to add " + filename + " to the CMakeLists.txt?", "Yes", "No").then((action: string | undefined) => {
							if (action) {
								if (action == 'Yes') {
									//console.log('Adding ' + filename + ' to CMakeLists.txt!');
									addFileToCmakeLists(getRelativeToWorkdir(file.fsPath)!);
								}
							}
						});
					}
				});
			});
		}
	};

	var deleteListener = function (event: vscode.FileDeleteEvent) {
		if (vscode.workspace.workspaceFolders) {
			event.files.forEach((file) => {
				vscode.workspace.findFiles("CMakeLists.txt").then((files) => {
					if (files.length != 0) {
						let filename = getLastPartOfPath(file.fsPath);
						if (filename == 'CMakeLists.txt') return;

						removeFileFromCMakeLists(getRelativeToWorkdir(file.fsPath)!);
					}
				})
			});
		}
	}

	let whenFileCreated = vscode.workspace.onDidCreateFiles(createListener);
	let whenFileDeleted = vscode.workspace.onDidDeleteFiles(deleteListener);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let addToCMakeCommand = vscode.commands.registerCommand('cmakesourcemanagerextension.addfiletocmake', (file: vscode.Uri) => {
		//console.log('Test!');
		if (vscode.workspace.workspaceFolders) {
			vscode.workspace.findFiles("CMakeLists.txt").then((files) => {
				if (files.length != 0) {
					let filename = getLastPartOfPath(file.fsPath);
					if (filename == 'CMakeLists.txt') return;

					//console.log('Adding ' + getRelativeToWorkdir(file.fsPath) + ' to CMakeLists.txt!');
					addFileToCmakeLists(getRelativeToWorkdir(file.fsPath)!);
				}
			});
		}
	});

	let removeFromCMakeCommand = vscode.commands.registerCommand('cmakesourcemanagerextension.removefilefromcmake', (file: vscode.Uri) => {
		if (vscode.workspace.workspaceFolders) {
			vscode.workspace.findFiles("CMakeLists.txt").then((files) => {
				if (files.length != 0) {
					let filename = getLastPartOfPath(file.fsPath);
					if (filename == 'CMakeLists.txt') return;

					removeFileFromCMakeLists(getRelativeToWorkdir(file.fsPath)!);
				}
			})
		}
	});

	context.subscriptions.push(whenFileCreated);
	context.subscriptions.push(whenFileDeleted);
	context.subscriptions.push(addToCMakeCommand);
}

function addFileToCmakeLists(relativeFile: string): void {
	let cMakeListsFile = vscode.workspace.findFiles("CMakeLists.txt").then((files) => {
		if (files.length != 0) {
			return files[0];
		}
		return undefined;
	});

	cMakeListsFile.then((file: vscode.Uri | undefined) => {
		if (!file) {
			return;
		}

		fs.readFile(file.fsPath, 'utf-8', function (err, data) {
			if (err) throw err;

			var lines = data.split('\n');
			if (lines.includes('list(APPEND EDITOR_SRCS "' + relativeFile + '")')) {
				vscode.window.showInformationMessage('"' + relativeFile + '" already included in CMakeLists.txt!');
				return;
			}

			var markerIndex = lines.findIndex((lineValue) => lineValue == '#VSCODE-CMAKE-EXT-MARKER' ? true : false);
			if (markerIndex == -1) {
				vscode.window.showErrorMessage("Couldn't find '#VSCODE-CMAKE-EXT-MARKER' in your CMakeLists.txt");
				return;
			}
			lines.splice(markerIndex, 0, 'list(APPEND EDITOR_SRCS "' + relativeFile + '")');
			var newValue = lines.join('\n');

			fs.writeFile(file.fsPath, newValue, 'utf-8', function (err) {
				if (err) throw err;
				//console.log("Added " + relativeFile + " to CMakeLists.txt");
				vscode.window.showInformationMessage('Added "' + relativeFile + '" to CMakeLists.txt!');
			});
		});
	}, (reason: any) => console.log(reason));
}

function removeFileFromCMakeLists(relativeFile: string): void {
	let cMakeListsFile = vscode.workspace.findFiles("CMakeLists.txt").then((files) => {
		if (files.length != 0) {
			return files[0];
		}
		return undefined;
	});

	cMakeListsFile.then((file: vscode.Uri | undefined) => {
		if (!file) {
			return;
		}

		fs.readFile(file.fsPath, 'utf-8', function (err, data) {
			if (err) throw err;

			var lines = data.split('\n');
			if (lines.includes('list(APPEND EDITOR_SRCS "' + relativeFile + '")')) {
				lines.splice(lines.indexOf('list(APPEND EDITOR_SRCS "' + relativeFile + '")'), 1);
				vscode.window.showInformationMessage('"' + relativeFile + '" removed from CMakeLists.txt!');
			}

			var newValue = lines.join('\n');

			fs.writeFile(file.fsPath, newValue, 'utf-8', function (err) {
				if (err) throw err;
			});
		});
	}, (reason: any) => console.log(reason));
}

function getLastPartOfPath(path: string): string {
	return path.substring(path.lastIndexOf('/') + 1);
}

function getRelativeToWorkdir(path: string): string | undefined {
	if (vscode.workspace.workspaceFolders) {
		return path.substring(path.indexOf(vscode.workspace.workspaceFolders[0].uri.path) + vscode.workspace.workspaceFolders[0].uri.path.length + 1);
	} else {
		return undefined;
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
