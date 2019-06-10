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
    reloadBefore: false,
    
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
            .toggleClass("hidden", !unread || unread < 0)

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
        $("a", ul).click(notifications.readAll)
    },
    readAll: function() {
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
                        notifications.before = $("time", list).last().attr("datetime")
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
                else if(notifications.reloadBefore)
                    notifications.loadHistory()
            },
        })
    },
    loadHistory: function() {
        if(notifications.loadingBefore)
            return

        if(!notifications.hasBefore)
            return
    
        if(notifications.loadingAfter && !notifications.before)
        {
            notifications.reloadBefore = true
            return
        }

        notifications.loadingBefore = true
        notifications.reloadBefore = false

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
    read: function(id) {
        var li = $("#notification" + id)
        if(li.hasClass("un-read")) {
            li.removeClass("un-read")
            notifications.setUnread(notifications.unread - 1)
        }
    },
    update: function(id) {
        var old = $("#notification" + id)
        if(!old.length)
            return

        $.ajax({
            url: "/notifications/" + id,
            method: "GET",
            success: function(data) {
                var li = $(formatTimeHtml(data))
                notifications.addClickHandler(li)
                old.replaceWith(li)                
            },
            error: function(req) {
                var resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
        })       
    },
    remove: function(id) {
        var li = $("#notification" + id)
        if(li.hasClass("un-read"))
            notifications.setUnread(notifications.unread - 1)
            
        li.remove()
    },
    isConnected : function() {
        return notifications.centrifuge && notifications.centrifuge.isConnected()
    },
    connect: function(token) {
        var proto = (document.location.protocol == "https:" ? "wss:" : "ws:")
        var url = proto + "//" + document.location.host + "/centrifugo/connection/websocket"
        var cent = new Centrifuge(url)

        cent.setToken(token)

        var name = $("body").data("meName")
        if(!name)
            return

        var channel = "notifications#" + name
        var subs = cent.subscribe(channel, function(message) {
            var ntf = message.data
            if(ntf.state == "new") {
                notifications.check()
                notifications.setUnread(notifications.unread + 1)
                notifications.sound.play()                
            } else if(ntf.state == "read") {
                notifications.read(ntf.id)
            } else if(ntf.state == "updated") {
                notifications.update(ntf.id)
            } else if(ntf.state == "removed") {
                notifications.remove(ntf.id)
            } else {
                console.log("Unknown notification state:", ntf.state)
            }
        })
        
        subs.on("subscribe", notifications.check)
        subs.on("error", function(err) {
            console.log("Subscribe to " + channel + ":", err.error)
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

$(".more-dropdown .notifications").mouseout(notifications.readAll)

$(".notifications-control").mouseenter(function() {
    if($("ul.notification-list").children().length < 5)
        notifications.loadHistory()    
})

$("a[href='#notifications']").click(function() {
    var a = $(this)
    var read = a.data("read")
    a.data("read", !read)
    
    if(read)
        notifications.readAll()
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

function checkFileSize(form) {
    var ok = true;
    var maxSize;
    $("input[type=file][data-max-size]", form).each(function(){
        if(typeof this.files[0] === "undefined")
            return true    
    
        maxSize = parseInt($(this).data("maxSize"), 10)
        var size = this.files[0].size
        ok = maxSize * 1024 * 1024 > size
        return ok
    });

    if(!ok) {
        alert("Можно загружать файлы размером не более " + maxSize + " Мб.")
    }

    return ok;    
}

$("div.file-upload").parents("form").submit(function(){
    checkFileSize(this)
})

$(".file-upload__input").change(function(){
    var input = $(this)
    var fileName = input.val().split('/').pop().split('\\').pop();
    input.prev().text(fileName)
})
