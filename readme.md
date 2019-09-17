Formatted Google Doc Link: https://docs.google.com/document/d/1fD7Qd1d7pBYQToZGNnylTmed-zWiu3g1OyMkqwd-OBE/edit?usp=sharing

Chrome Store Foxified
Update May 20, 2019: The extension is not working with the latest versions of Firefox. Basis for a workaround has been provided by the community - - and I hope to start experimenting with it soon.



Special thanks to to @killaz47 for writing up this workaround - https://github.com/Noitidart/Chrome-Store-Foxified/issues/122#issuecomment-493442310

Workaround until extension is fixed
Installing Chrome extensions on Firefox, self-made (killaz47) tested workaround:

1. Download and extract) firefox 56.0.1 portable from https://sourceforge.net/projects/portableapps/files/Mozilla%20Firefox%2C%20Portable%20Ed./
2. copy the URL from your derired chrome extension https://chrome.google.com/webstore/detail/web-videos-saver/odecbmmehabeloobkgokmfgldaegiflc
4. close your primary install of firefox
5. launch the firefox 56.0.1 portable edition from the previously extracted folder
6. login or create an account on https://addons.mozilla.org/en-US/firefox/
7. install https://addons.mozilla.org/en-US/firefox/addon/chrome-store-foxified/ itself

8. use “chrome store foxified” it as it meant to be by either:
 8a. Copying the url of a desired chrome extension https://chrome.google.com/webstore/detail/web-videos-saver/odecbmmehabeloobkgokmfgldaegiflc and by clicking on the "add to firefox, available on chrome". 
 8b. Installing it from (chrome extension file format) .crx file, which you can get by either:
 
8b. option a. using “get crx” chrome extension https://chrome.google.com/webstore/detail/get-crx/dijpllakibenlejkbajahncialkbdkjc
(useful if you have your extension installed, thus obtaining ext. ID (developer mode must be enabled in the extensions menu), but for some some reasons can’t get its chrome store url page) using https://chrome-extension-downloader.com/website

8b. option b. (useful if you want to use older version of chrome extension or its not existing on chrome store anymore) open your extension menu via settings or by url chrome://extensions/, Enable Developer Mode by clicking the toggle switch next to “Developer mode”, click on your extension, look up for its ID, get the same-named folder from “c:\Users[username]\AppData&&&2&&&\Local\Google\Chrome\User Data\Default\Extensions\” to some temporary folder, then, in chrome extension menu, click on “pack extension” button to pack your copied folder with the extension internal content to .crx file.


9 option a. (if direct usage, by using chrome extension url,was chosen)
 9a. “chrome store foxified” tab will open, for the first time you'll have to read an accept (with CATCHPA) an Mozilla AMO agreement.
 
9 option b. (if installing from .crx file was chosen) 
   9b 1. click on the “chrome store foxified” icon on top right of Mozilla toolbar, )“chrome store foxified” tab will open
   9b 2. click on the “No file selected - click here to browse” string below the “my computer” heading, and choose your previously downloaded .crx file
   9b 3. click “add to firefox”, file was added for conversion, for the first time you'll have to read an accept (with CATCHPA) an Mozilla AMO agreement
   9b 4. after accepting, the conversion should begin(messaging “uploading for review…-waiting for review X sec-downloading signed extension”)
 
10. After the conversion, the (desired chrome) extension “add” button will pop-up on the top-right corner of the Firefox (in other words, it would be installed as a usual firefox extension).

11. Go to about:debugging in the url address bar, then check “enable add-on debugging”.

12. Scroll down until you see your (chrome converted) extension id. An extension from this example, web videos saver, has “Extension ID odecbmmehabeloobkgokmfgldaegiflc@chrome-store-foxified-887013873”.


13. Close firefox portable, then go to [firefox portable folder]\Data\profile\extensions\ you’ll see the extension .xpi file with named as extension ID, so by this example its “odecbmmehabeloobkgokmfgldaegiflc@chrome-store-foxified-887013873.xpi”.

14. You have to options after this
 14a. Copy this .xpi file to (hidden folders option must be enabled in windows explorer https://support.microsoft.com/en-us/help/14201/windows-show-hidden-files) c:\Users[user name folder]\AppData\Roaming\Mozilla\Firefox\Profiles[Mozilla profile name folder]\extensions
 14b. install it manually in your primary/installed, latest firefox from an previously extracted .xpi file (copied to, for example, your desktop) 
   14b 1. Access the Add-ons interface. Go to Settings (☰) > Add-ons. 
   14b 2. This page will display any installed extensions. From here you can update, remove, or search for new extensions and add-ons. 
   14b 3. This page can also be accessed by pressing Ctrl+Shift+A or by typing “about:addons” into the address bar.     
   14b 4. Access the add-ons interface controls. 
   14b 5. From the add-ons interface, press Settings (gear icon) next to the add-on search bar. This will open a menu of add-on specific controls.
   14b 6. Select “Install Add-on from File…” from the menu. This will bring up a file explorer window.
   14b 7. Verify installation. Press “Install” in the notification and restart Firefox if necessary.

15. Done, Chrome extension has been installed on Firefox successfully.

Additional Guides
1. several chrome store foxified guides are available https://duckduckgo.com/?q=how+to+install+chrome+extensions+on+firefox&t=ffab&ia=web
2. hidden folders option must be enabled in windows explorer https://support.microsoft.com/en-us/help/14201/windows-show-hidden-files 
3. same, hidden folders option must be enabled in windows explorer https://support.microsoft.com/en-us/help/14201/windows-show-hidden-files 
4. Mozilla profile name and its folder path can be discovered by following these 
 4a. Launch Firefox. Press Alt key on the keyboard to see Firefox menus. 
 4b. Click the Help menu and then click Troubleshooting Information option. This action will open Troubleshooting Information page. 
 4c. Here, under Application Basics, look for Profile Folder. Next to it, there is Open Folder button. 
 4d. Click Open Folder button to open your Firefox profile folder.
