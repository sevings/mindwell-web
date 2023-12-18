function setOnline() {
    $.ajax({
        url: "/me/online",
        method: "PUT",
        dataType: "json",
        success: function(resp) {
            window.chats.setUnread(resp.chats)
            window.notifications.setUnread(resp.notifications)
        },
        error: (req) => {
            let resp = JSON.parse(req.responseText)
            console.log(resp.message)
        },
    })
}

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

            setInterval(setOnline, 180000)
            setOnline()
        }
    })
})

$(function() {
    let modal = $("#notifications-update")
    if(!modal.length)
        return

    if($(window).width() <= 768)
        return

    // popup requested
    if(document.location.hash.length > 1)
        return

    modal.modal("show")
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
    setUnread(val = 0) {
        let unread
        if(typeof val == "number")
            unread = val
        else
            unread = val.data("unreadCount")

        if(unread === undefined)
            return

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

        if(this.loadingAfter && !this.before)
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
    addClickHandler(li) {}
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
    addClickHandler(li) {
        li.find("a").click(() => { this.readAll() })
        li.click((event) => {
            this.readAll()
            let link = $(".notification-action", event.currentTarget).prop("href")
            setTimeout(() => {
                let url = new URL(link)
                if(window.location.pathname === url.pathname
                        && window.location.hash === url.hash)
                    window.location.reload()
                else
                    window.location = link
            }, 0)
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

        subs.on("subscribe", () => { })
        subs.on("error", (err) => {
            console.log("Subscribe to " + channel + ":", err.error)
        })

        this.sound = new Audio("/assets/notification.mp3")
    }
}

$(function() {
    window.notifications = new Notifications()
    window.notifications.start()
})

$("a[href='#notifications'], .notifications-control").click(function() {
    let feed = window.notifications

    if(feed.unread > 0)
        setTimeout(() => { feed.readAll() }, feed.unread * 500)

    if($(".notifications > .notification-list").children().length < 5)
        feed.loadHistory()
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
    addClickHandler(li) {
        li.click((event) => {
            let link = $(".notification-action", event.currentTarget).prop("href")
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
    read(chatID, msgID) {
        let li = $("#chat" + chatID)
        if(!li.hasClass("message-unread"))
            return

        if(li.data("lastMessage") > msgID)
            return

        li.removeClass("message-unread")
        li.find(".messages-counter").text("").addClass("hidden")
        this.setUnread(this.unread - 1)
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
            if(ntf.id === this.chat)
                return

            if(ntf.state === "new") {
                this.check()
                this.setUnread(this.unread + 1)
                this.sound.play()
            } else if(ntf.state === "read") {
                this.read(ntf.id, ntf.subject)
            } else if(ntf.state === "updated") {
                this.update(ntf.id)
            } else if(ntf.state === "removed") {
                this.remove(ntf.id)
            } else {
                console.log("Unknown notification state:", ntf.state)
            }
        })

        subs.on("subscribe", () => { })
        subs.on("error", (err) => {
            console.log("Subscribe to " + channel + ":", err.error)
        })

        this.chat = $("#chat-wrapper").data("id")
        this.sound = new Audio("/assets/message.mp3")
    }
}

$(function() {
    window.chats = new Chats()
    window.chats.start()
})

$("a[href='#chats'], .chats-control").click(function() {
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

$("#complain").click(function() {
    let popup = $("#complain-popup")
    if(!popup.data("ready"))
        return false

    let btn = $("#complain")
    if(btn.hasClass("disabled"))
        return false

    btn.addClass("disabled")

    popup.find(".contact-form").ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            popup.modal("hide")

            alert("Модераторы рассмотрят твою жалобу в ближайшее время.")
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false
})

$("#wish-created-popup, #wish-received-popup").on("hidden.bs.modal", function() {
    if(window.location.hash.startsWith("#wish"))
        window.history.back()
})

$(function(){
    let hash = window.location.hash
    if(hash.length > 1)
        $(window).trigger("hashchange")
})

$(window).on("hashchange", function () {
    let hash = window.location.hash
    let shown = $(".modal.show")
    if(shown.length && !hash.startsWith("#" + shown.attr("id"))) {
        shown.modal("hide")
    } else if(hash.startsWith("#wish-created-popup")) {
        loadCreatedWish(hash.substring(19))
    } else if(hash.startsWith("#wish-received-popup")) {
        loadReceivedWish(hash.substring(20))
    }
})

function loadCreatedWish(id) {
    if(!id) {
        alert("Пожелание не найдено.")
        if(window.location.hash.startsWith("#wish"))
            window.history.back()
        return false
    }

    let modal = $("#wish-created-popup")
    modal.data("id", id)

    $.ajax({
        url: "/wishes/" + id,
        method: "GET",
        dataType: "json",
        success: function(resp) {
            if(modal.data("id") !== id)
                return

            let user = $("#wish-receiver")
            user.text(resp.receiver.showName)
            user.prop("href", "/users/" + resp.receiver.name)

            let until = $("#wish-send-until time")
            until.attr("datetime", resp.sendUntil)
            formatTimeElements(modal)

            let form = modal.find("form")
            form.prop("action", "/wishes/" + id)

            form.find("textarea").val(resp.content)

            setWishCreatedStatus(resp.state)

            modal.modal("show")
        },
        error: function(req) {
            showAjaxError(req)
            if(window.location.hash.startsWith("#wish"))
                window.history.back()
        },
    })

    return false
}

function loadReceivedWish(id) {
    if(!id) {
        alert("Пожелание не найдено.")
        if(window.location.hash.startsWith("#wish"))
            window.history.back()
        return false
    }

    let modal = $("#wish-received-popup")
    modal.data("id", id)

    $.ajax({
        url: "/wishes/" + id,
        method: "GET",
        dataType: "json",
        success: function(resp) {
            if(modal.data("id") !== id)
                return

            $("#wish-content").text(resp.content)

            setWishReceivedStatus(resp.state)

            modal.modal("show")
        },
        error: function(req) {
            showAjaxError(req)
            if(window.location.hash.startsWith("#wish"))
                window.history.back()
        },
    })

    return false
}

$("#send-wish").click(function() {
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false

    let form = btn.parent()
    if(!form[0].reportValidity())
        return false

    btn.addClass("disabled")

    form.ajaxSubmit({
        method: "PUT",
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            setWishCreatedStatus("sent")
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false
})

$("#decline-wish").click(function() {
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false

    let action = btn.parent().prop("action")

    btn.addClass("disabled")

    $.ajax({
        url: action,
        method: "DELETE",
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            setWishCreatedStatus("declined")
        },
        error: showAjaxError,
        complete: function () {
            btn.removeClass("disabled")
        }
    })

    return false
})

$("#thank-wish").click(function() {
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false

    let id = $("#wish-received-popup").data("id")

    btn.addClass("disabled")

    $.ajax({
        url: "/wishes/" + id + "/thank",
        method: "POST",
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            setWishReceivedStatus("thanked")
        },
        error: showAjaxError,
        complete: function () {
            btn.removeClass("disabled")
        }
    })

    return false
})

$("#complain-wish a").click(function() {
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false

    if(!confirm("Отправить модераторам жалобу на это пожелание?")) {
        return false
    }

    let id = $("#wish-received-popup").data("id")

    btn.addClass("disabled")

    $.ajax({
        url: "/wishes/" + id + "/complain",
        method: "POST",
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            setWishReceivedStatus("complained")
        },
        error: showAjaxError,
        complete: function () {
            btn.removeClass("disabled")
        }
    })

    return false
})

function setWishCreatedStatus(state) {
    let buttons = $("#send-wish, #decline-wish")
    let status = $("#wish-created-status")
    let until = $("#wish-send-until")
    let content = $("#wish-created-popup textarea")
    let isNew = state === "new"
    buttons.toggleClass("hidden", !isNew)
    status.toggleClass("hidden", isNew)
    until.toggleClass("hidden", !isNew)
    content.prop("disabled", !isNew)
    if(!isNew) {
        if(state === "sent")
            status.text("Пожелание отправлено.")
        else if (state === "declined")
            status.text("Пожелание отклонено.")
        else if (state === "expired")
            status.text("Период возможности отправить пожелание истек.")
    }
}

function setWishReceivedStatus(state) {
    let links = $("#thank-wish, #complain-wish")
    let status = $("#wish-received-status")
    let isSent = state === "sent"
    links.toggleClass("hidden", !isSent)
    status.toggleClass("hidden", isSent)
    if(!isSent) {
        if(state === "thanked")
            status.text("Благодарность за пожелание отправлена.")
        else if (state === "complained")
            status.text("Жалоба на пожелание отправлена.")
    }
}
