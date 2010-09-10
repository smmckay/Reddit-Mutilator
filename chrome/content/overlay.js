var redditmutilator = {
  onLoad: function() {
    if("initialized" in this && this.initialized) {
        return;
    }
    this.initialized = true;
    this.strings     = document.getElementById("redditmutilator-strings");
    this.prefs       = Components.classes["@mozilla.org/preferences-service;1"]
                                 .getService(Components.interfaces.nsIPrefService)
                                 .getBranch("extensions.redditmutilator.");
    this.boolprefs   = ["blocknsfw"];
    this.listprefs   = ["blockusers", "blockdomains"];
    this.url_regex   = new RegExp("^http://www.reddit.com(/r/[^/]+)?/[^/]*$");

    document.getElementById("contentAreaContextMenu")
            .addEventListener("popupshowing", redditmutilator.showContextMenu, false);

    document.getElementById("appcontent")
            .addEventListener("DOMContentLoaded", redditmutilator.onPageLoad, true);
  },

  unpackListPref: function(pref_name) {
        var packed_list = prefs.getCharPref(pref_name);
        var items = packed_list.split(";").filter(function(elem) {
            return elem != "";
        });
        return items;
  },

  packListPref: function(pref_name, pref_items) {
      var packed_list = pref_items.join(";");
      prefs.setCharPref(pref_name, packed_list);
  },

  onPageLoad: function(aEvent) {
    var doc = aEvent.originalTarget;
    if(!doc.location.href.match(url_regex)) {
        return;
    }
    redditmutilator.filterPage(doc);
  },

  showContextMenu: function(event) {
    var blockuser = document.getElementById("context-redditmutilator-blockuser");
    var blockdomain = document.getElementById("context-redditmutilator-blockdomain");

    blockuser.hidden = true;
    blockdomain.hidden = true;

    if(!gBrowser.currentURI.spec.match(url_regex)) {
        return;
    }

    var elem = document.popupNode;
    if(elem.parentNode.nodeName == "SPAN" && elem.parentNode.className == "domain") {
        blockdomain.hidden = false;
        return;
    } else if(elem.nodeName == "A" && elem.className.indexOf("author") != -1) {
        blockuser.hidden = false;
        return;
    }
  },

  onContextBlockItem: function(pref) {
    var blocked_items = redditmutilator.unpackListPref(pref);
    var new_schmuck = document.popupNode.textContent;
    if(blocked_items.indexOf(new_schmuck) == -1) {
        blocked_items.push(new_schmuck);
    }
    redditmutilator.packListPref(pref, blocked_items);
    redditmutilator.filterPage(gBrowser.contentDocument);
  },

  onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, strings.getString("helloMessageTitle"),
                                strings.getString("helloMessage"));
  },

  filterPage: function(doc) {
    boolprefs.forEach(function(elem) {
        if(prefs.getBoolPref(elem)) {
            redditmutilator[elem](doc);
        }
    });

    listprefs.forEach(function(elem) {
        var items = redditmutilator.unpackListPref(elem);
        if(items.length > 0) {
            redditmutilator[elem](doc, items);
        }
    });
  },

  xpath: function(context, query) {
      return context.evaluate(query, context, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  },

  blocknsfw: function(doc) {
    var nsfw_links = this.xpath(doc, '//div[contains(@class,"over18")]');
    for(var i = 0; i < nsfw_links.snapshotLength; i++) {
        nsfw_links.snapshotItem(i).style.display = "none";
    }
  },

  blockdomains: function(doc, domains) {
      var domain_nodes = this.xpath(doc, '//span[@class="domain"]/a');
      for(var i = 0; i < domain_nodes.snapshotLength; i++) {
          var domain_node = domain_nodes.snapshotItem(i);
          for(var j = 0; j < domains.length; j++) {
            if(domain_node.textContent.indexOf(domains[j]) != -1) {
                domain_node.parentNode
                           .parentNode
                           .parentNode
                           .parentNode.style.display = "none";
                break;
            }
          }
      }
  },

  blockusers: function(doc, users) {
      var user_nodes = this.xpath(doc, '//a[contains(@class, "author")]');
      for(var i = 0; i < user_nodes.snapshotLength; i++) {
          var user_node = user_nodes.snapshotItem(i);
          for(var j = 0; j < users.length; j++) {
              if(user_node.textContent == users[j]) {
                  user_node.parentNode
                           .parentNode
                           .parentNode.style.display = "none";
                  break;
              }
          }
      }
  }
};

window.addEventListener("load", redditmutilator.onLoad, false);
