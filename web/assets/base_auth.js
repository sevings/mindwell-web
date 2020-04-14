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

$(function() {
    let proto = (document.location.protocol === "https:" ? "wss:" : "ws:")
    let url = proto + "//" + document.location.host + "/centrifugo/connection/websocket"
    window.centrifuge = new Centrifuge(url)

    $.ajax({
        method: "GET",
        url: "/account/subscribe/token",
        dataType: "json",
        success: function(resp) {
            window.centrifuge.setToken(resp.token)
            window.centrifuge.connect()
        }
    })
})

class Feed {
    constructor() {
        this.after = ""
        this.hasAfter = true
        this.loadingAfter = false
        this.reloadAfter = false

        this.before = ""
        this.hasBefore = true
        this.loadingBefore = false
        this.reloadBefore = false

        this.unread = 0
        this.sound = null
    }
    setUnread(val) {
        let unread
        if(typeof val == "number")
            unread = val
        else
            unread = val.data("unreadCount")

        if(unread < 0)
            unread = 0

        if(unread === this.unread)
            return

        this.updateCounter(unread)
        this.unread = unread
    }
    setBefore(ul) {
        this.hasBefore = ul.data("hasBefore")
        let nextBefore = ul.data("before")
        if(nextBefore)
            this.before = nextBefore
    }
    setAfter(ul) {
        this.hasAfter = ul.data("hasAfter")
        let nextAfter = ul.data("after")
        if(nextAfter)
            this.after = nextAfter
    }
    preCheck() {
        if(this.loadingAfter) {
            this.reloadAfter = true
            return false
        }

        if(this.loadingBefore && !this.after)
        {
            this.reloadAfter = true
            return false
        }

        this.loadingAfter = true
        this.reloadAfter = false

        return true
    }
    postCheck(data) {
        let ul = $(formatTimeHtml(data))
        this.addClickHandler(ul)
        this.setUnread(ul)
        this.setAfter(ul)
        fixSvgUse(ul)

        return ul
    }
    preLoadHistory() {
        if(this.loadingBefore)
            return false

        if(!this.hasBefore)
            return false

        if(this.loadingAfter && !notifications.before)
        {
            this.reloadBefore = true
            return false
        }

        this.loadingBefore = true
        this.reloadBefore = false

        return true
    }
    postLoadHistory(data) {
        let ul = $(formatTimeHtml(data))
        this.addClickHandler(ul)
        this.setUnread(ul)
        this.setBefore(ul)
        fixSvgUse(ul)

        if(!this.after)
            this.setAfter(ul)

        return ul
    }
    postLoadList() {
        this.loadingAfter = false
        this.loadingBefore = false
        if(this.reloadAfter)
            this.check()
        else if(this.reloadBefore)
            this.loadHistory()
    }
    postLoadItem(data) {
        let li = $(formatTimeHtml(data))
        this.addClickHandler(li)
        fixSvgUse(li)

        return li
    }
    updateCounter(unread) {}
    addClickHandler(element) {}
    check() {}
    loadHistory() {}
}

class Notifications extends Feed {
    updateCounter(unread) {
        $(".notifications-counter")
            .text(unread)
            .toggleClass("hidden", !unread)

        let title = document.title
        let repl = unread ? "(" + unread + ") " : ""

        if(this.unread > 0)
            title = title.replace(/^\(\d+\) /, repl)
        else
            title = repl + title

        document.title = title
    }
    addClickHandler(ul) {
        $("a", ul).click(() => { this.readAll() })
        let ntf = this
        ul.click(function() {
            ntf.readAll()
            let link = $(this).find(".notification-action").prop("href")
            if(window.location.pathname === new URL(link).pathname)
                window.location.reload()
            else
                window.location = link
        })
    }
    readAll() {
        if(!this.unread)
            return 

        $(".notifications li.un-read").removeClass("un-read")

        this.setUnread(0)

        $.ajax({
            url: "/notifications/read?time=" + this.after,
            method: "PUT",
        })        
    }
    check() {
        if(!this.preCheck())
            return

        $.ajax({
            url: "/notifications?unread=true&after=" + this.after,
            method: "GET",
            success: (data) => {
                let ul = this.postCheck(data)
                let list = $(".notifications > .notification-list")
                list.prepend(ul).children(".data-helper").remove()

                if(list.children().length > 0) {
                    $(".notifications-placeholder").remove()
                    if(!this.before) {
                        this.before = $("time", list).last().attr("datetime")
                    }
                }
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: () => { this.postLoadList() },
        })
    }
    loadHistory() {
        if(!this.preLoadHistory())
            return

        $.ajax({
            url: "/notifications?limit=10&before=" + this.before,
            method: "GET",
            success: (data) => {
                let ul = this.postLoadHistory(data)
                let list = $(".notifications > .notification-list")
                list.append(ul).children(".data-helper").remove()

                if(list.children().length > 0)
                    $(".notifications-placeholder").remove()
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: () => { this.postLoadList() },
        })
    }
    read(id) {
        let li = $("#notification" + id)
        if(li.hasClass("un-read")) {
            li.removeClass("un-read")
            this.setUnread(this.unread - 1)
        }
    }
    update(id) {
        let old = $("#notification" + id)
        if(!old.length)
            return

        $.ajax({
            url: "/notifications/" + id,
            method: "GET",
            success: (data) => {
                let li = this.postLoadItem(data)
                old.replaceWith(li)                
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
        })       
    }
    remove(id) {
        let li = $("#notification" + id)
        if(li.hasClass("un-read"))
            this.setUnread(this.unread - 1)
            
        li.remove()
    }
    start() {
        let name = $("body").data("meName")
        if(!name)
            return

        let channel = "notifications#" + name
        let subs = window.centrifuge.subscribe(channel, (message) => {
            let ntf = message.data
            if(ntf.state === "new") {
                this.check()
                this.setUnread(this.unread + 1)
                this.sound.play()
            } else if(ntf.state === "read") {
                this.read(ntf.id)
            } else if(ntf.state === "updated") {
                this.update(ntf.id)
            } else if(ntf.state === "removed") {
                this.remove(ntf.id)
            } else {
                console.log("Unknown notification state:", ntf.state)
            }
        })

        subs.on("subscribe", () => { this.check() })
        subs.on("error", (err) => {
            console.log("Subscribe to " + channel + ":", err.error)
            this.check()
        })

        this.sound = new Audio("/assets/notification.mp3")
    }
}

$(function() {
    window.notifications = new Notifications()
    window.notifications.start()
})

$(".more-dropdown .notifications").mouseout(() => { window.notifications.readAll() })

$(".notifications-control").mouseenter(function() {
    if($(".notifications > .notification-list").children().length < 5)
        window.notifications.loadHistory()
})

$("a[href='#notifications']").click(function() {
    let a = $(this)
    let read = a.data("read")
    a.data("read", !read)
    
    if(read)
        window.notifications.readAll()
    else if($(".notifications > .notification-list").children().length < 5)
        window.notifications.loadHistory()
})

$("div.notifications").scroll(function() { 
    let scroll = $(this)
    let list = $("ul", scroll)

    if(scroll.scrollTop() < list.height() - scroll.height() - 300)
        return

    window.notifications.loadHistory()
});

class Chats extends Feed {
    updateCounter(unread) {
        $(".chats-counter")
            .text(unread)
            .toggleClass("hidden", !unread)
    }
    addClickHandler(ul) {
        ul.click(function() {
            let link = $(this).find(".notification-action").prop("href")
            if(window.location.pathname === new URL(link).pathname)
                window.location.reload()
            else
                window.location = link
        })
    }
    check() {
        if(!this.preCheck())
            return

        $.ajax({
            url: "/chats?limit=10&after=" + this.after,
            method: "GET",
            success: (data) => {
                let ul = this.postCheck(data)
                ul.each(function() {
                    if(this.id)
                        $("#" + this.id).remove()
                })

                let list = $(".chats > .notification-list")
                list.prepend(ul).children(".data-helper").remove()

                if(list.children().length > 0) {
                    $(".chats-placeholder").remove()
                    if(!this.before) {
                        this.setBefore(ul)
                    }
                }
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: () => { this.postLoadList() },
        })
    }
    loadHistory() {
        if(!this.preLoadHistory())
            return

        $.ajax({
            url: "/chats?limit=10&before=" + this.before,
            method: "GET",
            success: (data) => {
                let ul = this.postLoadHistory(data)
                let list = $(".chats > .notification-list")
                list.append(ul).children(".data-helper").remove()

                if(list.children().length > 0)
                    $(".chats-placeholder").remove()
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: () => { this.postLoadList() },
        })
    }
    read(id) {
        let li = $("#chat" + id)
        if(li.hasClass("message-unread")) {
            li.removeClass("message-unread")
            this.setUnread(this.unread - 1)
        }
    }
    update(id) {
        let old = $("#chat" + id)
        if(!old.length)
            return

        let name = old.data("name")

        $.ajax({
            url: "/chats/" + name,
            method: "GET",
            success: (data) => {
                old.remove()

                let li = this.postLoadItem(data)
                let list = $(".chats > .notification-list")
                list.prepend(li)
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
        })
    }
    remove(id) {
        let li = $("#chat" + id)
        if(li.hasClass("message-unread"))
            this.setUnread(this.unread - 1)

        li.remove()
    }
    start() {
        let name = $("body").data("meName")
        if(!name)
            return

        let channel = "messages#" + name
        let subs = window.centrifuge.subscribe(channel, (message) => {
            let ntf = message.data
            if(ntf.state === "new") {
                this.check()
                this.setUnread(this.unread + 1)
                this.sound.play()
            } else if(ntf.state === "read") {
                this.read(ntf.id)
            } else if(ntf.state === "updated") {
                this.update(ntf.id)
            } else if(ntf.state === "removed") {
                this.remove(ntf.id)
            } else {
                console.log("Unknown notification state:", ntf.state)
            }
        })

        subs.on("subscribe", () => { this.check() })
        subs.on("error", (err) => {
            console.log("Subscribe to " + channel + ":", err.error)
            this.check()
        })

        this.sound = new Audio("/assets/notification.mp3")
    }
}

$(function() {
    window.chats = new Chats()
    window.chats.start()
})

$(".chats-control").mouseenter(function() {
    if($(".chats > .notification-list").children().length < 5)
        window.chats.loadHistory()
})

$("a[href='#chats']").click(function() {
     if($(".chats > .notification-list").children().length < 5)
        window.chats.loadHistory()
})

$("div.chats").scroll(function() {
    let scroll = $(this)
    let list = $("ul", scroll)

    if(scroll.scrollTop() < list.height() - scroll.height() - 300)
        return

    window.chats.loadHistory()
});

function checkFileSize(form) {
    let ok = true;
    let maxSize;
    $("input[type=file][data-max-size]", form).each(function(){
        if(typeof this.files[0] === "undefined")
            return true    
    
        maxSize = parseInt($(this).data("maxSize"), 10)
        let size = this.files[0].size
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
    let input = $(this)
    let fileName = input.val().split('/').pop().split('\\').pop();
    input.prev().text(fileName)
})

var ytPlayers = []
var nextYtIds = []

function onYtStateChange(event) {
    if(event.data != YT.PlayerState.PLAYING)
        return

    var id = event.target.getIframe().id
    $.each(ytPlayers, function() {
        if (this.getPlayerState() == YT.PlayerState.PLAYING
            && this.getIframe().id != id)
            this.pauseVideo()
    })
}

function prepareYtPlayer() {
    if(!this.id)
        this.id="yt-video" + (ytPlayers.length + nextYtIds.length)

    nextYtIds.push(this.id)
}

function addYtPlayers() {
    for(var i = 0; i < nextYtIds.length; i++)
    {
        ytPlayers.push(new YT.Player(nextYtIds[i], {
            events: {
                "onStateChange": onYtStateChange
            }
        }))
    }

    nextYtIds = []
}

function onYouTubeIframeAPIReady() {
    $("iframe.yt-video").each(prepareYtPlayer)
    addYtPlayers()
}
