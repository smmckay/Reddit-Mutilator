var options = {
onLoad: function() {
    this.blocked_comment_users_elem = document.getElementById("blockcommentusersbox");
    this.user_unity_elem = document.getElementById("userunitybox");
    this.user_unity_elem.addEventListener("command", options.userUnityClicked, "false");
    options.userUnityClicked();
},

userUnityClicked: function(){
    blocked_comment_users_elem.disabled = user_unity_elem.checked;
},
};
window.addEventListener("load", options.onLoad, false);
