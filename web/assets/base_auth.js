function setOnline() {
    function sendRequest() {
        $.ajax({
            url: "/me/online",
            method: "PUT"
        })    
    }

    setInterval(sendRequest, 180000)

    sendRequest()
}

$(setOnline)

var notifications = {
    after: "", 
    hasAfter: true,
    loadingAfter: false,
    reloadAfter: false,

    before: "",
    hasBefore: true,
    loadingBefore: false,
    
    unread: 0,
    centrifuge: null,
    sound: null,

    setUnread: function(val) {
        var unread 
        if(typeof val == "number")
            unread = val
        else
            unread = val.data("unreadCount")
        
        if(unread == notifications.unread)
            return

        $(".notifications-counter")
            .text(unread)
            .toggleClass("hidden", unread == 0)

        var title = document.title
        var repl = unread ? "(" + unread + ") " : ""
        
        if(notifications.unread > 0)
            title = title.replace(/^\(\d+\) /, repl)
        else
            title = repl + title

        document.title = title

        notifications.unread = unread
    },
    setBefore: function(ul) {
        notifications.hasBefore = ul.data("hasBefore")
        var nextBefore = ul.data("before")
        if(nextBefore)
            notifications.before = nextBefore        
    },
    setAfter: function(ul) {
        notifications.hasAfter = ul.data("hasAfter")
        var nextAfter = ul.data("after")
        if(nextAfter)
            notifications.after = nextAfter
    },
    addClickHandler: function(ul) {
        $("a", ul).click(notifications.read)
    },
    read: function() {
        if(!notifications.unread)
            return 

        $("ul.notification-list > li.un-read").removeClass("un-read")

        notifications.setUnread(0)

        $.ajax({
            url: "/notifications/read?time=" + notifications.after,
            method: "PUT",
        })        
    },
    check: function() {
        if(notifications.loadingAfter) {
            notifications.reloadAfter = true
            return
        }

        notifications.loadingAfter = true
        notifications.reloadAfter = false
        
        $.ajax({
            url: "/notifications?unread=true&after=" + notifications.after,
            method: "GET",
            success: function(data) {
                var ul = $(formatTimeHtml(data))
                notifications.addClickHandler(ul)
                notifications.setUnread(ul)
                notifications.setAfter(ul)

                var list = $("ul.notification-list")
                list.prepend(ul).children(".data-helper").remove()

                if(list.children().length > 0) {
                    $(".notifications-placeholder").remove()
                    if(!notifications.before) {
                        notifications.setBefore(ul)
                    }
                }
            },
            error: function(req) {
                var resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: function() {
                notifications.loadingAfter = false
                if(notifications.reloadAfter)
                    notifications.check()
            },
        })
    },
    loadHistory: function() {
        if(notifications.loadingBefore)
            return

        if(!notifications.hasBefore)
            return
    
        notifications.loadingBefore = true;

        $.ajax({
            url: "/notifications?limit=10&before=" + notifications.before,
            method: "GET",
            success: function(data) {
                var ul = $(formatTimeHtml(data))
                notifications.addClickHandler(ul)
                notifications.setUnread(ul)
                notifications.setBefore(ul)

                var list = $("ul.notification-list")
                list.append(ul).children(".data-helper").remove()

                if(list.children().length > 0)
                    $(".notifications-placeholder").remove()
            },
            error: function(req) {
                var resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: function() { 
                notifications.loadingBefore = false
            },
        })
    },
    isConnected : function() {
        return notifications.centrifuge && notifications.centrifuge.isConnected()
    },
    connect: function(token) {
        var proto = (document.location.protocol == "https:" ? "wss:" : "ws:")
        var url = proto + "//" + document.location.host + "/centrifugo/connection/websocket"
        var cent = new Centrifuge(url)

        cent.setToken(token)

        var id = $("body").data("meId")
        var channel = "notifications#" + id
        var subs = cent.subscribe(channel, function(message) {
            var ntf = message.data
            if(ntf.read) {
                var li = $("#notification" + ntf.id)
                if(li.hasClass("un-read")) {
                    li.removeClass("un-read")
                    notifications.setUnread(notifications.unread - 1)
                }
            } else {
                notifications.check()
                notifications.sound.play()                
            }
        })
        
        subs.on("subscribe", notifications.check)
        subs.on("error", function(err) {
            console.error("Subscribe to " + channel + ":", err.error)
            notifications.check()
        })

        cent.connect()

        notifications.centrifuge = cent
    },
    start: function() {
        $.ajax({
            method: "GET",
            url: "/account/subscribe/token",
            dataType: "json",
            success: function(resp) {
                notifications.connect(resp.token)
            }
        })

        notifications.sound = new Audio("/assets/notification.mp3")
    }
}

$(notifications.start)

$(".more-dropdown .notifications").mouseout(notifications.read)

$(".notifications-control").mouseenter(function() {
    if($("ul.notification-list").children().length < 5)
        notifications.loadHistory()    
})

$("a[href='#notifications']").click(function() {
    var a = $(this)
    var read = a.data("read")
    a.data("read", !read)
    
    if(read)
        notifications.read()
    else if($("ul.notification-list").children().length < 5)
        notifications.loadHistory()
})

$("div.notifications").scroll(function() { 
    var scroll = $(this)
    var list = $("ul", scroll)

    if(scroll.scrollTop() < list.height() - scroll.height() - 300)
        return

    notifications.loadHistory()
});
