function addFeedClickHandlers(feed) {
    $("a.post-down", feed).click(function() {
        return vote($(this), false)
    })

    $("a.post-up", feed).click(function() {
        return vote($(this), true)
    })

    $(".cut-post .post-content", feed).click(onCutContentClick)
    $(".cut-post .post-thumb", feed).click(onCutContentClick)
    $(".cut-post .post-content a", feed).click(onCutContentLinkClick)
    
    $("a.watch-post", feed).click(onWatchPostClick)
    $("a.favorite-post", feed).click(onFavoritePostClick)
    $("a.delete-post", feed).click(onDeletePostClick)
    $("a.complain-post", feed).click(onComplainPostClick)

    $(".comment-form textarea", feed).on("keydown", onCommentFormKeyDown)
    $(".post-comment", feed).click(onPostCommentClick)
    $(".cancel-comment", feed).click(onCancelCommentClick)
    
    $(".play-video", feed).click(onPlayVideoClick)

    $(".comment-button", feed).click(onCommentButtonClick)
    $(".more-comments", feed).click(loadComments)
    $(".open-post", feed).click(openPost)

    $(".post-tags a", feed).each(setTagHref)
}

function findPostElement(elem) {
    elem = $(elem)

    let post = elem.parents(".entry")
    let id = post.data("id")
    post = $(".entry[data-id=\"" + id + "\"]")
    return post
}

function vote(counter, positive) {
    var info = findPostElement(counter)
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    var vote = info.data("vote")
    var delVote = vote && (positive == vote > 0)

    $.ajax({
        url: "/entries/" + id + "/vote?positive=" + positive,
        method: delVote ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            vote = resp.vote || 0
            info.data("vote", vote)

            var upLink = info.find(".post-up")
            var downLink = info.find(".post-down")
            var span = info.find(".post-rating")

            var upCount = (resp.upCount || 0)
            var downCount = (resp.downCount || 0)
            span.text(upCount - downCount)
            
            var title = upCount + " за, " + downCount + " против.\nРейтинг: " + Math.round(resp.rating || 0)
            upLink.attr("title", title)
            downLink.attr("title", title)
            span.attr("title", title)

            var up = vote > 0
            upLink.find("[data-fa-i2svg]")
                .toggleClass("far", !up)
                .toggleClass("fas", up)

            var down = vote < 0
            downLink.find("[data-fa-i2svg]")
                .toggleClass("far", !down)
                .toggleClass("fas", down)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            info.data("enabled", true)
        },
    })

    return false
}

function onCutContentClick(){
    if($(".fixed-sidebar").hasClass("open"))
        return

    var selection = window.getSelection()
    if(selection.toString().length > 0 && selection.containsNode(this, true))
        return
    
    var info = $(this).parents(".entry")
    var id = info.data("id")
    openPost(id)
}

function onCutContentLinkClick(){
    var a = $(this)
    if(a.hasClass("play-video"))
        return true

    if(a.children("img").length)
        return true

    window.open(a.prop("href"), "_blank")
    return false
}

function onWatchPostClick() {
    var info = findPostElement(this)
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    var watching = !!info.data("watching")
    var link = info.find("a.watch-post")

    $.ajax({
        url: "/entries/" + id + "/watching",
        method: watching ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            watching = !!resp.isWatching
            info.data("watching", watching)

            if(watching)
                link.html("Отписаться от&nbsp;комментариев")
            else
                link.html("Подписаться на&nbsp;комментарии")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            info.data("enabled", true)
        },
    })

    return false
}

function onFavoritePostClick() {
    var info = findPostElement(this)
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    var favorited = !!info.data("favorited")
    var link = info.find("a.favorite-post")

    $.ajax({
        url: "/entries/" + id + "/favorite",
        method: favorited ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            favorited = !!resp.isFavorited
            info.data("favorited", favorited)

            if(favorited)
                link.html("Удалить из&nbsp;избранного")
            else
                link.html("Добавить в&nbsp;избранное")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            info.data("enabled", true)
        },
    })

    return false
}

function onDeletePostClick() {
    if(!confirm("Пост будет удален навсегда."))
        return false

    var info = findPostElement(this)
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    
    $("#post-popup.show").removeClass("fade").modal("hide")

    $.ajax({
        url: "/entries/" + id,
        method: "DELETE",
        success: function(resp) {
            var loc = window.location;
            if((loc.pathname == "/entries/" + id &&
                document.referrer == loc.origin + loc.pathname) || // for ignore hash
                document.referrer == loc.origin + loc.pathname + "/edit")
                    loc.replace(loc.origin + "/me");
            else if(loc.pathname == "/entries/" + id)
                    window.history.back();
            else {
                var post = $("#post" + id)
                var feed = $("#feed")
                if(feed.hasClass("sorting-container"))
                    feed.isotope("remove", post).isotope("layout")
                else
                    post.remove()
            }
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
    })

    return false
}

function onComplainPostClick() {
    let info = findPostElement(this)
    let name = info.find(".post__author-name").first().text();
    $("#complain-user").text(name)
    $("#complain-type").text("запись")

    let id = info.data("id")
    $("#complain-popup").data("ready", true)
        .find(".contact-form").attr("action", "/entries/" + id + "/complain")

    window.location.hash = "complain-popup"

    return false
}

function onCommentButtonClick() {
    $("#post-popup").data("scroll", "comments")
    let id = findPostElement(this).data("id")
    return openPost(id)
}

function setTagHref() {
    let path = document.location.pathname
    if(path.startsWith("/entries"))
        return

    let tag = $(this).text()
    this.href = "?tag=" + tag
}

function complainComment(id) {
    let info = $("#comment" + id)
    let name = info.find(".post__author-name").text();
    $("#complain-user").text(name)
    $("#complain-type").text("комментарий")

    $("#complain-popup").data("ready", true)
        .find(".contact-form").attr("action", "/comments/" + id + "/complain")

    window.location.hash = "complain-popup"

    return false
}

function incCommentCounter(elem, added = 1) {
    let entry = findPostElement(elem)
    let counter = entry.find(".comment-count")
    let count = counter.text() - 0
    count += added
    counter.text(count)
}

function loadComments() {
    let a = $(this)
    if(a.hasClass("disabled"))
        return false

    a.addClass("disabled")

    $.ajax({
        url: a.attr("href"),
        success: function(data) {
            var ul = a.parent()

            var comments = $(formatTimeHtml(data))
            comments.find("iframe.yt-video").each(prepareYtPlayer)
            comments.each(function(){ CRUMINA.mediaPopups(this) })
            ul.prepend(comments)
            fixSvgUse(comments)
            addYtPlayers()
            a.remove()

            var upd = ul.find(".update-comments")
            if(upd.length > 1)
                upd.first().remove()

            ul.find(".more-comments").click(loadComments)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
        complete: function() {
            a.removeClass("disabled")
        },
    })

    return false
}

function updateComments(entry) {
    if(entry.data("loading"))
        return

    entry.data("loading", true)

    let a = entry.find(".update-comments")
    $.ajax({
        url: a.attr("href"),
        success: function(data) {
            var ul = a.parent()
            var hasPrev = ul.find(".comment-item").length > 0
            var hasMore = ul.find(".more-comments").length > 0

            var comments = $(formatTimeHtml(data))
            comments.find("iframe.yt-video").each(prepareYtPlayer)
            comments.each(function(){ CRUMINA.mediaPopups(this) })
            ul.append(comments)
            fixSvgUse(comments)
            addYtPlayers()

            let upd = ul.find(".update-comments")
            if(upd.length > 1)
                upd.first().remove()

            if(hasPrev) {
                var more = ul.find(".more-comments")
                if(!hasMore || more.length > 1)
                    more.last().remove()
            }

            // remove duplicates
            var items = {}
            let added = comments.filter(".comment-item").length
            ul.find(".comment-item").each(function(){ 
                var item = $(this)
                var id = item.data("id")

                var prev = items[id]
                if(prev) {
                    prev.remove()
                    added--
                }

                items[id] = item
            })

            if(hasPrev && added > 0)
                incCommentCounter(ul, added)
        },
        error: showAjaxError,
        complete: function() {
            entry.removeData("loading")
        },
    })

    return false
}

function postComment(entry) {
    var btn = entry.find(".post-comment")
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var form = entry.find("form.comment-form")
    if(!form[0].reportValidity())
        return false

    form.ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            var cmt = $(formatTimeHtml(data))
            cmt.find("iframe.yt-video").each(prepareYtPlayer)
            CRUMINA.mediaPopups(cmt)

            let id = cmt.data("id")
            let prev = entry.find("#comment" + id)
            if(prev.length)
                prev.replaceWith(cmt)
            else {
                let ul = entry.find(".comments-list")
                ul.append(cmt)
                incCommentCounter(ul)
            }

            fixSvgUse(cmt)
            addYtPlayers()
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false;
}

function sendComment(entry) {
    var form = entry.find(".comment-form")
    var save = form.data("id") > 0

    if(save)
        return saveComment(entry)
    
    return postComment(entry)
}

function onCommentFormKeyDown(e){
    if(e.key != "Enter")
        return

    if(e.shiftKey)
        return

    if(window.isTouchScreen)
        return

    var entry = $(this).parents(".entry")
    entry.find(".comment-form textarea").blur()
    return sendComment(entry)
}

function onPostCommentClick(){
    var entry = $(this).parents(".entry")
    return sendComment(entry)
}

function scrollToCommentEdit(area) {
    var modal = $("#post-popup.show")
    if(modal.length > 0)
        modal.animate({ scrollTop: modal.children().outerHeight() }, 500)
    else
        $("html, body").animate({ scrollTop: area.offset().top }, 500);    
}

function replyComment(showName, a) { 
    var entry = $(a).parents(".entry")
    var area = entry.find("form.comment-form textarea")
    area.val(function(i, val){
        if(val.includes(showName))
            return val

        return showName + ", " + val
    })

    scrollToCommentEdit(area)
        
    return false
}

function editComment(id) {
    var cmt = $("#comment" + id)
    var content = unescapeHtml(cmt.data("content") + "")
    var form = cmt.parents(".entry").find(".comment-form")
    form.attr("action", "/comments/"+id)
    form.data("id", id)
    form.find("textarea").val(content)
    form.find(".cancel-comment").toggleClass("hidden", false)
    form.find(".post-comment").text("Сохранить")

    var area = form.find("textarea")
    scrollToCommentEdit(area)

    return false
}

function saveComment(entry) {
    var btn = entry.find(".post-comment")
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var form = entry.find(".comment-form")

    form.ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            var cmt = $(formatTimeHtml(data))
            cmt.find("iframe.yt-video").each(prepareYtPlayer)
            CRUMINA.mediaPopups(cmt)
            var id = form.data("id")
            $("#comment"+id).replaceWith(cmt)
            fixSvgUse(cmt)
            addYtPlayers()
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
            clearCommentForm(entry)
        },
    })

    return false
}

function clearCommentForm(entry) {
    var form = entry.find(".comment-form")
    form.attr("action", "/entries/" + entry.data("id") + "/comments")
    form.data("id", "")
    form[0].reset()
    form.find(".cancel-comment").toggleClass("hidden", true)
    form.find(".post-comment").text("Отправить")

    return false
}

function onCancelCommentClick(){
    var entry = $(this).parents(".entry")
    return clearCommentForm(entry)
}

function deleteComment(id) {
    if(!confirm("Комментарий будет удален навсегда."))
        return false

    $.ajax({
        url: "/comments/" + id,
        method: "DELETE",
        success: function() {
            $("#comment" + id).remove()
        },
        error: showAjaxError,
    })

    return false
}

function voteComment(id, positive) {
    var cmt = $("#comment"+id)
    if(cmt.data("enabled") == false)
        return false

    cmt.data("enabled", false)

    var vote = cmt.data("vote")
    var delVote = vote && (positive == vote > 0)

    $.ajax({
        url: "/comments/" + id + "/vote?positive=" + positive,
        method: delVote ? "DELETE" : "PUT",
        dataType: "json",
        success: function(resp) {
            vote = resp.vote || 0
            cmt.data("vote", vote)

            var upLink = cmt.find(".comment-up")
            var downLink = cmt.find(".comment-down")
            var span = cmt.find(".comment-rating")

            var upCount = (resp.upCount || 0)
            var downCount = (resp.downCount || 0)
            span.text(upCount - downCount)
            
            var title = upCount + " за, " + downCount + " против.\nРейтинг: " + Math.round(resp.rating || 0)
            upLink.attr("title", title)
            downLink.attr("title", title)
            span.attr("title", title)

            var up = vote > 0
            upLink.find("[data-fa-i2svg]")
                .toggleClass("far", !up)
                .toggleClass("fas", up)

            var down = vote < 0
            downLink.find("[data-fa-i2svg]")
                .toggleClass("far", !down)
                .toggleClass("fas", down)
        },
        error: showAjaxError,
        complete: function() {
            cmt.data("enabled", true)
        },
    })

    return false;
}

function scrollPost() {
    let modal = $("#post-popup")
    if(!modal.find(".entry").length)
        return

    let scroll = modal.data("scroll")
    modal.removeData("scroll")

    if(scroll == "comments") {
        let comments = modal.find("ul.comments-list")
        modal.animate({ scrollTop: comments.position().top }, 500);
        return
    }

    if(scroll)
    {
        modal.data("video", "")
        let iframe = modal.find("iframe[data-video='" + scroll + "']")
        modal.animate({ scrollTop: iframe.position().top }, 500);
        for(let i = 0; i < ytPlayers.length; i++)
        {
            var player = ytPlayers[i]
            if(player.getPlayerState() === YT.PlayerState.PLAYING)
                break

            if(player.getIframe().id !== iframe.attr("id"))
                continue

            player.playVideo()
            break
        }
        return
    }

}

$("#post-popup").on("show.bs.modal", function() {
    $(".gif-play-image").gifplayer("stop")
})

$("#post-popup").on("shown.bs.modal", function(event) {
    scrollPost()
})

$("#post-popup").on("hide.bs.modal", function() {
    var modal = $(this)

    modal.find("iframe.yt-video").each(function(i) {
        this.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    });

    modal.find(".gif-play-image").gifplayer("stop")
})

$("#post-popup").on("hidden.bs.modal", function() {
    if(window.location.hash.startsWith("#post-popup"))
        window.history.back()
    else
        openHashModal()
})

$("#complain-popup").on("hidden.bs.modal", function(){
    $("#complain-popup").data("ready", false)
                
    if(window.location.hash.startsWith("#complain-popup"))
        window.history.back()
    else
        openHashModal()
})

$(window).on("hashchange", function () {
    let hash = window.location.hash
    let shown = $(".modal.show")
    if(shown.length && !hash.startsWith("#" + shown.attr("id")))
        shown.modal("hide")
    else
        openHashModal()
})

$(function(){
    addFeedClickHandlers()

    let hash = window.location.hash
    if(hash.startsWith("#post-popup"))
        openPost(hash.substring(11))
})

function openHashModal() {
    let hash = window.location.hash
    if(hash.startsWith("#post-popup")) {
        let id = hash.substring(11)
        if($("#post-popup.show").data("id") != id)
            openPost(id)
    }
    else if(hash == "#complain-popup") {
        let modal = $(hash)
        if(modal.data("ready"))
            modal.modal("show")
    }
}

function openPost(id) {
    let randomPost = id === 0 || id === "0"

    if(typeof id != "string" && typeof id != "number")
        id = $(this).data("entry")

    let modal = $("#post-popup")
    if(modal.data("id") == id)
    {
        if(modal.data("loading"))
            return false

        if(!randomPost) {
            updateComments(modal)
            window.location.hash = "post-popup" + id
            modal.modal("show")
            return false
        }
    }

    modal.data("loading", true)
    modal.data("id", id)
    modal.modal("show")

   window.location.hash = "post-popup" + id

    let body = modal.find(".modal-body")
    body.removeData("id").removeClass("entry")
    body.empty().append(
        "<div class=\"ui-block-title\">" +
        "<h4 class=\"title hcenter\">Загрузка…</h4>" +
        "</div>"
    )

    $.ajax({
        method: "GET",
        url: "/entries/" + (randomPost ? "random" : id),
        dataType: "HTML",
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(entry) {
            if(modal.data("id") != id)
                return

            body.replaceWith(entry)

            addFeedClickHandlers(modal)
            formatTimeElements(modal)
            modal.find("iframe.yt-video").each(prepareYtPlayer)
            modal.find(".gif-play-image").gifplayer()
            modal.each(function(){ CRUMINA.mediaPopups(this) })
            fixSvgUse(modal)
            addYtPlayers()

            if(modal.hasClass("show"))
                scrollPost()
        },
        error: function(req) {
            modal.modal("hide")
            showAjaxError(req)
        },
        complete: function() {
            modal.removeData("loading")
        }
    })

    return false
}

function loadFeed(url, onSuccess) {
    let container = $("#feed")
    if(container.data("loading"))
        return false

    container.data("loading", true)

    $.ajax({
        url: url,
        method: "GET",
        success: function(data) {
            if(onSuccess)
                onSuccess()

            let page = $(formatTimeHtml(data))

            if(container.hasClass("sorting-container")) {
                container.isotope("insert", page)
                page.find(".post-content,.post-thumb").imagesLoaded()
                    .progress(function() {
                        container.isotope('layout')
                    })
            } else
                container.append(page)

            addFeedClickHandlers(page)
            page.find("iframe.yt-video").each(prepareYtPlayer)
            page.find(".gif-play-image").gifplayer()
            page.each(function() {
                CRUMINA.mediaPopups(this)
            })
            fixSvgUse(page)
            addYtPlayers()
        },
        error: function(req) {
            let resp = JSON.parse(req.responseText)
            console.log(resp.message)
        },
        complete: function() {
            container.removeData("loading")
        },
    })

    return false
}

function onFeedWindowScroll() {
    let container = $("#feed")
    if(!container.length)
        return

    let scroll = $(this)
    if(scroll.scrollTop() < container.height() - scroll.height() * 2)
        return

    let sort = container.data("sort")
    let a = (!sort || sort === "new") ? container.find(".older") : container.find(".newer")
    if(!a.length)
        return

    if(a.parent().hasClass("disabled")) {
        a.parents(".sorting-item").remove()
        return
    }

    loadFeed(a.attr("href"), () => { a.parents(".sorting-item").remove() })
}

function onUsersWindowScroll() {
    let container = $("#users")
    if(!container.length)
        return

    let scroll = $(this)
    if(scroll.scrollTop() < container.height() - scroll.height() * 2)
        return

    if(container.data("loading"))
        return

    let a = container.find(".older")
    if(!a.length)
        return

    if(a.parent().hasClass("disabled")) {
        a.parents(".sorting-item").remove()
        return
    }

    container.data("loading", true)

    $.ajax({
        url: a.attr("href"),
        method: "GET",
        success: function(data) {
            a.parents(".sorting-item").remove()

            let page = $(formatTimeHtml(data))

            if(container.hasClass("sorting-container")) {
                container.isotope("insert", page)
                page.find(".friend-header-thumb").imagesLoaded()
                    .progress(function() { container.isotope('layout') })
            }
            else
                container.append(page)
        },
        error: function(req) {
            let resp = JSON.parse(req.responseText)
            console.log(resp.message)
        },
        complete: function() {
            container.removeData("loading")
        },
    })
}

$(document).ready(function(){
    $(window).scroll(onFeedWindowScroll)
    $(window).scroll(onUsersWindowScroll)
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

$("#feed-search").submit(function(){
    if(!this.reportValidity())
        return false

    let container = $("#feed")
    container.data("sort", "search")

    let query = $("#feed-search").find("input").val()
    let url = document.location.pathname + "?query=" + query

    let section = $("#feed-settings input[name='section']").val()
    if(section)
        url += "&section=" + section

    let clear = () => {
        container.find(".pagination").parents(".sorting-item").remove()
        $("#empty-feed").remove()
        $("#search-popup").modal("hide")

        $("#search-button").toggleClass("active", true)
            .find("span").toggleClass("hidden", false)

        let feedSort = $("#feed-sort")
        if(feedSort.length && !feedSort.find("option[value='search'").length) {
            feedSort
                .append("<option value='search' selected>Результаты поиска</option>")
                .selectpicker("refresh")
        }

        let old = container.children(".entry")
        if(container.hasClass("sorting-container")) {
            container.isotope("remove", old)
                .isotope('layout')
        } else {
            old.remove()
        }
    }

    return loadFeed(url, clear)
})

function onPlayVideoClick(){
    let a = $(this)
    let video = a.data("video")
    let id = a.parents(".entry").data("id")
    $("#post-popup").data("scroll", video)
    openPost(id)

    return false
}
