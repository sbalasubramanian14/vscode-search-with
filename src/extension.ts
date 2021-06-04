// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import * as open from "open";
import axios from "axios";

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export const activate = (context: vscode.ExtensionContext) => {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when the extension is activated
  console.log('Congratulations, "vscode-search-with" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const searchWithText = vscode.commands.registerCommand(
    "extension.vscode-search-with",
    async () => {
      const searchTerm = getContextText();
      await searchData(searchTerm);
    }
  );

  const searchWithGoogle = vscode.commands.registerCommand(
    "extension.vscode-search-with-google",
    async () => {
      const searchTerm = getContextText();
      openURL(searchTerm, "google");
    }
  );

  const searchWithStack = vscode.commands.registerCommand(
    "extension.vscode-search-with-stack",
    async () => {
      const searchTerm = getContextText();
      openURL(searchTerm, "stack");
    }
  );

  const searchWithDocs = vscode.commands.registerCommand(
    "extension.vscode-search-with-docs",
    async () => {
      const searchTerm = getContextText();
      vscode.window.showInformationMessage(
        `Docs search is in development, watch out for an update soon!!`
      );
      // let myStatusBarItem = vscode.window.createStatusBarItem(
      //   vscode.StatusBarAlignment.Right,
      //   100
      // );
      // myStatusBarItem.command = "extension.vscode-search-with-docs";
      // myStatusBarItem.text = `Docs search is in development, watch out for an update soon!!`;
      // myStatusBarItem.show();
      // setTimeout(() => {
      //   myStatusBarItem.hide();
      // }, 5000);
      // context.subscriptions.push(myStatusBarItem);
    }
  );

  context.subscriptions.push(searchWithText);
  context.subscriptions.push(searchWithGoogle);
  context.subscriptions.push(searchWithStack);
  context.subscriptions.push(searchWithDocs);
};

// search data based on the user search query
const searchData = async (searchTerm: string): Promise<void> => {
  searchTerm = searchTerm.trim();

  const searchQuery = await vscode.window.showInputBox({
    value: searchTerm,
    placeHolder: "Search",
    prompt: "Enter your query here 👆",
  });

  if (!searchQuery || searchQuery.trim() === "") {
    return;
  }

  if (searchQuery) {
    vscode.window.showInformationMessage(
      "You are searching for: " + searchQuery
    );
    console.log(`User initiated a search with [${searchQuery}] search term`);

    const encodedSearchQuery = encodeURIComponent(searchQuery);

    const params = {
      order: "desc",
      sort: "relevance",
      intitle: encodedSearchQuery,
      tagged: encodeURIComponent(getTags(searchQuery).join(";")),
      site: "stackoverflow",
      key: "*SIrITnvDcmA4Wxs90VX*Q((",
    };

    let userSelection = [
      {
        title: `🔎 Google: ${searchQuery}`,
        url: getURL(encodedSearchQuery, "google"),
      },
      {
        title: `🔎 Stackoverflow: ${searchQuery}`,
        url: getURL(encodedSearchQuery, "stack"),
      },
    ];

    try {
      const searchResult = await axios.get(
        "https://api.stackexchange.com/2.2/search",
        {
          params,
          paramsSerializer: function paramsSerializer(params) {
            // "Hide" the `answer` param
            return Object.entries(
              Object.assign({}, params, { answer: "HIDDEN" })
            )
              .map(([key, value]) => `${key}=${value}`)
              .join("&");
          },
        }
      );
      const resultData = searchResult.data;
      if (resultData && resultData.items && resultData.items.length) {
        resultData.items.forEach((element: any, index: number) => {
          userSelection.push({
            title: `${index + 1}: ${
              element.is_answered ? "✔️" : "⛔"
            } ${decodeURIComponent(element.title)} | ${element.score}🔺 ${
              element.answer_count
            }❗ `,
            url: element.link,
          });
        });
      }
    } catch (error) {
      console.log(error);
    }

    const prompt = userSelection.map((query) => query.title);
    const selectedQuery = await vscode.window.showQuickPick(prompt, {
      canPickMany: false,
    });
    const queryObj = userSelection.find((q) => q.title === selectedQuery);
    const redirectURL = queryObj
      ? queryObj.url
      : getURL(encodedSearchQuery, "stack");
    if (redirectURL) {
      open(redirectURL);
    }
  }
};

const openURL = (searchQuery: string, type: string) => {
  if (!searchQuery || searchQuery.trim() === "") {
    return;
  }

  const encodedSearchQuery = encodeURIComponent(searchQuery);
  open(getURL(encodedSearchQuery, type));
};

const getURL = (searchQuery: string, type: string) => {
  if (type === "stack") {
    return `https://stackoverflow.com/search?q=${searchQuery}`;
  } else {
    return `https://www.google.com/search?q=${searchQuery}`;
  }
};

const getTags = (searchQuery: string) => {
  // process tags
  const tags: string[] = [];
  const regex = /\[(.+?)\]/gm;
  let tagsMatch;
  let updatedSearchTerm = searchQuery;
  while ((tagsMatch = regex.exec(updatedSearchTerm)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (tagsMatch.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    // The result can be accessed through the `m`-variable.
    tagsMatch.forEach((match, groupIndex) => {
      if (groupIndex === 0) {
        // full match without group for replace
        updatedSearchTerm = updatedSearchTerm.replace(match, "").trim();
      } else if (groupIndex === 1) {
        // not a full match
        tags.push(match);
      }
    });
  }
  return tags;
};

const getContextText = (): string => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return "";
  }

  const document = editor.document;
  const eol = document.eol === 1 ? "\n" : "\r\n";
  let result: string = "";
  const selectedTextLines = editor.selections.map((selection) => {
    if (
      selection.start.line === selection.end.line &&
      selection.start.character === selection.end.character
    ) {
      const range = document.lineAt(selection.start).range;
      const text = editor.document.getText(range);
      return `${text}${eol}`;
    }

    return editor.document.getText(selection);
  });

  if (selectedTextLines.length > 0) {
    result = selectedTextLines[0];
  }

  result = result.trim();
  return result;
};

// this method is called when the extension is deactivated
export function deactivate() {}
