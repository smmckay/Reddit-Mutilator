var options = {
onLoad: function() {
    this.pref_pairs = {
        "userunitybox": "blockcommentusersbox",
        "whitelistsubredditsbox": "whitelistedsubredditsbox"
    }
    for(var i in this.pref_pairs) {
        var checkbox = document.getElementById(i);
        checkbox.paired_elem = pref_pairs[i];
        checkbox.addEventListener("command", options.checkboxClicked, "false");
        options.checkboxClicked.call(checkbox);
    }
},

checkboxClicked: function() {
    document.getElementById(this.paired_elem).disabled = this.checked;
}
};
window.addEventListener("load", options.onLoad, false);
