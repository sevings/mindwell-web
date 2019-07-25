function addFeedClickHandlers(feed) {
    $("a.post-down", feed).click(function() {
        return vote($(this), false)
    })

    $("a.post-up", feed).click(function() {
        return vote($(this), true)
    })

    $(".cut-post .post-content", feed).click(onCutContentClick)
    $(".cut-post .post-content a", feed).click(onCutContentLinkClick)
    
    $("a.watch-post", feed).click(onWatchPostClick)
    $("a.favorite-post", feed).click(onFavoritePostClick)
    $("a.delete-post", feed).click(onDeletePostClick)

    $(".comment-form textarea", feed).on("keydown", onCommentFormKeyDown)
    $(".post-comment", feed).click(onPostCommentClick)
    $(".cancel-comment", feed).click(onCancelCommentClick)
    
    $(".play-video", feed).click(onPlayVideoClick)
}

function vote(counter, positive) {
    var info = counter.parents(".entry")
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
    var selection = window.getSelection()
    if(selection.toString().length > 0 && selection.containsNode(this, true))
        return
    
    var info = $(this).parents(".entry")
    var id = info.data("id")
    $("#post-popup"+id).modal("show")
}

function onCutContentLinkClick(){
    var a = $(this)
    if(a.hasClass("play-video"))
        return true

    window.open(a.prop("href"), "_blank")
    return false
}

function onWatchPostClick() {
    var info = $(this).parents(".entry")
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
    var info = $(this).parents(".entry")
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

    var info = $(this).parents(".entry")
    if(info.data("enabled") == false)
        return false

    info.data("enabled", false)

    var id = info.data("id")
    
    $(".post-popup.show").removeClass("fade").modal("hide")

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

function loadComments(href, a) {
    a = $(a)
    if(a.hasClass("disabled"))
        return false

    a.addClass("disabled")

    $.ajax({
        url: href,
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
    var a = entry.find(".update-comments")
    if(a.hasClass("disabled"))
        return false

    a.addClass("disabled")

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

            if(ul.find(".update-comments").length > 1)
                a.remove()
            
            if(hasPrev) {
                var more = ul.find(".more-comments")
                if(!hasMore || more.length > 1)
                    more.last().remove()
            }

            // remove duplicates
            var items = {}
            ul.find(".comment-item").each(function(){ 
                var item = $(this)
                var id = item.data("id")

                var prev = items[id]
                if(prev)
                    prev.remove()
                
                items[id] = item
            })
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

function postComment(entry) {
    var btn = entry.find(".post-comment")
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    entry.find("form.comment-form").ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            var cmt = $(formatTimeHtml(data))
            cmt.find("iframe.yt-video").each(prepareYtPlayer)
            CRUMINA.mediaPopups(cmt)
            entry.find(".comments-list").append(cmt)
            fixSvgUse(cmt)
            addYtPlayers()

            var counter = entry.find(".comment-count")
            var count = counter.text()
            count++
            counter.text(count)
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
    var modal = $(".post-popup.show")
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

$(".post-popup").on("show.bs.modal", function(event) {
    window.location.hash = this.id;
    
    var entry = $(this).parents(".entry")
    updateComments(entry)

    $(".gif-play-image").gifplayer("stop")
})

$(".post-popup").on("shown.bs.modal", function(event) {
    var modal = $(this)
    var video = modal.data("video")
    if(video) {
        modal.data("video", "")
        var iframe = modal.find("iframe[data-video='" + video + "']")
        modal.animate({ scrollTop: iframe.position().top }, 500);
        for(var i = 0; i < ytPlayers.length; i++)
        {
            var player = ytPlayers[i]
            if(player.getPlayerState() == YT.PlayerState.PLAYING)
                break
            
            if(player.getIframe().id != iframe.attr("id"))
                continue
                
            player.playVideo()
            break
        }
        return
    }

    var a = $(event.relatedTarget)
    if(a.hasClass("comment-button")) {
        var comments = modal.find("ul.comments-list")
        modal.animate({ scrollTop: comments.position().top }, 500);
        return
    }
})

$(".post-popup").on("hide.bs.modal", function() {
    var modal = $(this)

    modal.find("iframe.yt-video").each(function(i) {
        this.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    });

    modal.find(".gif-play-image").gifplayer("stop")

    if(window.location.hash == "")
        return

    window.history.back()

    if(window.location.hash != "")
        window.location.hash = ""
})

$(window).on("hashchange", function () {
    if(window.location.hash == "")
        $(".post-popup.show").modal("hide");
    else
        $(window.location.hash).modal("show")
})

$(function(){
    addFeedClickHandlers()

    if(window.location.hash != "")
        $(window.location.hash).modal("show")
})

function onPlayVideoClick(){
    var a = $(this)
    var video = a.data("video")
    var modal = a.parents(".entry").find(".modal")
    modal.data("video", video)
    modal.modal("show")

    return false
}

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
