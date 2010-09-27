var redditmutilator = {
onLoad: function() {
    if("initialized" in this && this.initialized) {
        return;
    }
    this.initialized       = true;
    this.strings           = document.getElementById("redditmutilator-strings");
    this.prefs             = Components.classes["@mozilla.org/preferences-service;1"]
                                       .getService(Components.interfaces.nsIPrefService)
                                       .getBranch("extensions.redditmutilator.");
    this.hideprefs         = {"blocknsfw":  '//div[contains(@class,"over18")]',
                              "hideshare": '//span[contains(@class,"share-button")]/..',
                              "hidesave": '//form[contains(@class,"save-button")]/..',
                              "hidehide": '//form[contains(@class,"hide-button")]/..',
                              "hidereport": '//form[contains(@class,"report-button")]/..',
                              "hidecreatebox": '//div[@class="sidebox create"]/..',
                              "hidesubmitbox": '//div[@class="sidebox submit"]/..',
                              "hidemodbox": '//h1[text()="' + strings.getString("modBoxText") + '"]/../..',
                              "hiderecentbox": '//h1[text()="' + strings.getString("recentBoxText") + '"]/../..',
                              "hidesubredditbar": '//div[@id="sr-header-area"]',
                              "hidesearchbox": '//form[@id="search"]/..',
                              "hideinfobox": '//div[@class="linkinfo"]/..'};
    this.listprefs         = ["blockusers", "blockdomains"];
    this.links_regex       = new RegExp("^http://www.reddit.com(/+r/+[^/]+)?/*[^/]*$");
    this.comments_regex    = new RegExp("^http://www.reddit.com/+r/+[^/]+/+comments");
    this.whitelist_regex   = new RegExp("^http://www.reddit.com/+r/+([^/]+)");

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
    if(doc.location.href.match(links_regex)) {
        redditmutilator.filterLinksPage(doc);
    } else if(doc.location.href.match(comments_regex)) {
        redditmutilator.filterCommentsPage(doc);
    }
},

showContextMenu: function(event) {
    var blockuser        = document.getElementById("context-redditmutilator-blockuser");
    var blockdomain      = document.getElementById("context-redditmutilator-blockdomain");
    var blockcommentuser = document.getElementById("context-redditmutilator-blockcommentuser");

    blockuser.hidden        = true;
    blockdomain.hidden      = true;
    blockcommentuser.hidden = true;

    if(gBrowser.currentURI.spec.match(links_regex)) {
        var elem = document.popupNode;
        if(elem.parentNode.nodeName == "SPAN" && elem.parentNode.className == "domain") {
            blockdomain.hidden = false;
            return;
        } else if(elem.nodeName == "A" && elem.className.indexOf("author") != -1) {
            blockuser.hidden = false;
            return;
        }
    } else if(gBrowser.currentURI.spec.match(comments_regex)) {
        var elem = document.popupNode;
        if(elem.nodeName == "A" && elem.className.indexOf("author") != -1)
            blockcommentuser.hidden = false;
    }
},

contentBlockAddItem: function(pref) {
    var blocked_items = redditmutilator.unpackListPref(pref);
    var new_schmuck   = document.popupNode.textContent;
    if(blocked_items.indexOf(new_schmuck) == -1) {
        blocked_items.push(new_schmuck);
    }
    redditmutilator.packListPref(pref, blocked_items);
},

onLinksContextBlockItem: function(pref) {
    redditmutilator.contentBlockAddItem(pref);
    redditmutilator.filterLinksPage(gBrowser.contentDocument);
},

onCommentContextBlockUser: function() {
    var user_pref = "blockcommentusers";
    if(prefs.getBoolPref("userunity")) {
        user_pref = "blockusers";
    }
    redditmutilator.contentBlockAddItem(user_pref);
    redditmutilator.filterCommentsPage(gBrowser.contentDocument);
},

onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, strings.getString("helloMessageTitle"),
                                strings.getString("helloMessage"));
},

filterLinksPage: function(doc) {
    if(!prefs.getBoolPref("whitelistsubreddits")) {
        var allowed_subreddits = redditmutilator.unpackListPref("whitelistedsubreddits");
        var current_subreddit  = whitelist_regex.exec(doc.location.href)[1];
        if(allowed_subreddits.indexOf(current_subreddit) == -1) {
            var body = doc.getElementById("header").parentNode;
            var body_children = body.childNodes;
            for(var i = 0; i < body_children.length; i++) {
                body_children.item(i).style.display = "none";
            }
            var div = doc.createElement("div");
            div.innerHTML = "<h1>Reddit Mutilator has been configured to block this subreddit.</h1>" +
                            "<p>To change subreddit whitelisting, go to Tools->Add-ons->Reddit Mutilator->Options->Content Blocking</p>";
            body.appendChild(div);
            return;
        }
    }
    for(var i in hideprefs) {
        if(prefs.getBoolPref(i)) {
            redditmutilator.hideElements(doc, hideprefs[i]);
        }
    }

    listprefs.forEach(function(elem) {
        var items = redditmutilator.unpackListPref(elem);
            if(items.length > 0) {
                redditmutilator[elem](doc, items);
            }
    });
},

filterCommentsPage: function(doc) {
    for(var i in hideprefs) {
        if(prefs.getBoolPref(i)) {
            redditmutilator.hideElements(doc, hideprefs[i]);
        }
    }

    var blockeduserspref = "blockcommentusers";
    if(prefs.getBoolPref("userunity")) {
        blockeduserspref = "blockusers";
    }
    var blockedusers = redditmutilator.unpackListPref(blockeduserspref);
    var authornodes  = redditmutilator.xpath(doc, '//div[@class="noncollapsed"]//a[contains(@class, "author")]');
    for(var i = 0; i < authornodes.snapshotLength; i++) {
        var authornode = authornodes.snapshotItem(i);
        if(blockedusers.indexOf(authornode.textContent) != -1) {
            authornode.parentNode
                      .parentNode
                      .parentNode
                      .parentNode.style.display = 'none';
        }
    }
},

xpath: function(context, query) {
    return context.evaluate(query, context, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
},

hideElements: function(doc, query) {
    var elements = this.xpath(doc, query);
    for(var i = 0; i < elements.snapshotLength; i++) {
        elements.snapshotItem(i).style.display = "none";
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
},
};

window.addEventListener("load", redditmutilator.onLoad, false);
