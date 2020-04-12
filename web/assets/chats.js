class Messages {
    constructor() {
        this.after = ""
        this.hasAfter = true
        this.loadingAfter = false
        this.reloadAfter = false

        this.before = ""
        this.hasBefore = true
        this.loadingBefore = false
        this.reloadBefore = false

        this.name = ""
        this.unread = 0
        this.sound = null
    }
    send() {
        let uid = $("#message-uid")
        if(!uid.val())
            uid.val(Date.now())

        let form = $("#message-form")
        if(!form[0].reportValidity())
            return false

        form.ajaxSubmit({
            headers: {
                "X-Error-Type": "JSON",
            },
            success: (data) => {
                uid.val("")

                let msg = $(formatTimeHtml(data))
                CRUMINA.mediaPopups(msg)

                let ul = $("#chat-wrapper ul")
                let id = msg.data("id")
                let prev = ul.find("#message" + id)
                if(prev.length)
                    prev.replaceWith(msg)
                else
                    ul.append(msg)

                fixSvgUse(msg)
                this.scrollToBottom()
            },
            error: showAjaxError,
            clearForm: true,
        })

        return false
    }
    edit(a) {
        let msg = $(a).parents(".comment-item")
        let id = msg.data("id")
    }
    delete(a) {
        if(!confirm("Сообщение будет удалено навсегда."))
            return false

        let msg = $(a).parents(".comment-item")
        let id = msg.data("id")

        $.ajax({
            url: "/messages/" + id,
            method: "DELETE",
            success: function() {
                msg.remove()
            },
            error: showAjaxError,
        })

        return false
    }
    atBottom() {
        let scroll = $("div.messages")
        let list = $("ul", scroll)
        return scroll.scrollTop() >= list.height() - scroll.height()
    }
    scrollToBottom() {
        let scroll = $("div.messages")
        let list = $("ul", scroll)
        scroll.scrollTop(list.height() - scroll.height())
    }
    addClickHandler(ul) {
        $("a.delete-message", ul).click((e) => { return this.delete(e.target) })
        $("a.edit-message", ul).click((e) => { return this.edit(e.target) })
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
    readAll() {
        if(!this.unread)
            return

        $("ul.comments-list > li.un-read").removeClass("un-read")

        this.setUnread(0)

        $.ajax({
            url: "/chats/" + this.name + "/read?message=" + this.after,
            method: "PUT",
        })
    }
    check() {
        if(this.loadingAfter) {
            this.reloadAfter = true
            return
        }

        if(this.loadingBefore && !this.after)
        {
            this.reloadAfter = true
            return
        }

        this.loadingAfter = true
        this.reloadAfter = false

        let wasAtBottom = this.atBottom()

        $.ajax({
            url: "/chats/" + this.name + "/messages?after=" + this.after,
            method: "GET",
            success: (data) => {
                let ul = $(formatTimeHtml(data))
                this.addClickHandler(ul)
                this.setUnread(ul)
                this.setAfter(ul)
                fixSvgUse(ul)

                let list = $("ul.comments-list")
                list.append(ul).children(".data-helper").remove()

                if(list.children().length > 0) {
                    $(".messages-placeholder").remove()
                    if(!this.before) {
                        this.setBefore(ul)
                    }
                }
                if(wasAtBottom) {
                    this.scrollToBottom()
                }
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: () => {
                this.loadingAfter = false
                if(this.reloadAfter)
                    this.check()
                else if(this.reloadBefore)
                    this.loadHistory()
            },
        })
    }
    loadHistory() {
        if(this.loadingBefore)
            return

        if(!this.hasBefore)
            return

        if(this.loadingAfter && !notifications.before)
        {
            this.reloadBefore = true
            return
        }

        this.loadingBefore = true
        this.reloadBefore = false

        $.ajax({
            url: "/chats/" + this.name + "/messages?before=" + this.before,
            method: "GET",
            success: (data) => {
                let ul = $(formatTimeHtml(data))
                this.addClickHandler(ul)
                this.setUnread(ul)
                this.setBefore(ul)
                fixSvgUse(ul)

                if(!this.after)
                    this.setAfter(ul)

                let list = $("ul.comments-list")
                list.prepend(ul).children(".data-helper").remove()

                if(list.children().length > 0)
                    $(".messages-placeholder").remove()
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
            complete: () => {
                this.loadingBefore = false
            },
        })
    }
    read(id) {
        let li = $("#message" + id)
        if(li.hasClass("un-read")) {
            li.removeClass("un-read")
            this.setUnread(this.unread - 1)
        }
    }
    update(id) {
        let old = $("#message" + id)
        if(!old.length)
            return

        $.ajax({
            url: "/messages/" + id,
            method: "GET",
            success: (data) => {
                let li = $(formatTimeHtml(data))
                this.addClickHandler(li)
                old.replaceWith(li)
            },
            error: (req) => {
                let resp = JSON.parse(req.responseText)
                console.log(resp.message)
            },
        })
    }
    remove(id) {
        let li = $("#message" + id)
        if(li.hasClass("un-read"))
            this.setUnread(this.unread - 1)

        li.remove()
    }
    start() {
        this.name = $("#chat-wrapper").data("name")
        this.sound = new Audio("/assets/notification.mp3")
        this.check()
    }
}

$(function() {
    window.messages = new Messages()
    window.messages.start()
})

$("#send-message").click(() => { window.messages.send() })

$("#message-form textarea").on("keydown", (e) => {
    if(e.key != "Enter")
        return

    if(e.shiftKey)
        return

    if(window.isTouchScreen)
        return

    return window.messages.send()
})

$("div.messages").scroll(function() {
    if($(this).scrollTop() < 300)
        window.messages.loadHistory()
});
