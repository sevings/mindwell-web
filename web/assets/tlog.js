$("#follow, #unfollow").click(function() {
    return setRelationFromMe("followed")
})

$("#hide-posts").click(function() {
    return setRelationFromMe("hidden")
})

$("#blacklist").click(function() {
    return setRelationFromMe("ignored")
})

$("#permit-rel").click(function() {
    return handleFriendRequest("PUT")
})

$("#cancel-rel").click(function() {
    return handleFriendRequest("DELETE")
})

function setRelationFromMe(relation) {
    var profile = $("#profile")
    var name = profile.data("name")
    var relationFromMe = profile.data("relFromMe")

    var method
    if(relationFromMe == relation || (relation == "followed") && relationFromMe == "requested")
        method = "DELETE"
    else
        method = "PUT"

    $.ajax({
        url: "/relations/to/" + name + "?r=" + relation,
        method: method,
        dataType: "json",
        success: function(resp) {
            profile.data("name", resp.to)
            profile.data("relFromMe", resp.relation)

            updateRelations()
        },
        error: showAjaxError,
    })    
}

function handleFriendRequest(method) {
    var profile = $("#profile")
    var name = profile.data("name")

    $.ajax({
        url: "/relations/from/" + name,
        method: method,
        dataType: "json",
        success: function(resp) {
            profile.data("name", resp.from)
            profile.data("relToMe", resp.relation)

            updateRelations()
        },
        error: showAjaxError,
    })

    return false
}

function updateRelations() {
    var profile = $("#profile")
    var privacy = profile.data("privacy")
    var mePrivacy = $("body").data("mePrivacy")
    var relationToMe = profile.data("relToMe")
    var relationFromMe = profile.data("relFromMe")
    
    var followed = relationFromMe == "followed"

    var followBtn = $("#follow")
    followBtn.attr("hidden", followed)

    var unfollow = $("#unfollow")
    unfollow.parent().attr("hidden", !followed)

    if(!followed) {
        followBtn.removeClass("bg-blue bg-breez bg-grey")

        if(relationFromMe == "requested")
            followBtn.addClass("bg-breez")
        else if(relationFromMe == "ignored" || relationFromMe == "hidden")
            followBtn.addClass("bg-grey")
        else
            followBtn.addClass("bg-blue")        
    }

    var ignored = relationToMe == "ignored" || relationFromMe == "ignored" || relationFromMe == "hidden"
    followBtn.toggleClass("disabled", ignored)

    var followTitle

    if(relationToMe == "ignored")
        followTitle = "Ты в черном списке"
    else if(relationFromMe == "ignored")
        followTitle = "В черном списке"
    else if(relationFromMe == "hidden")
        followTitle = "Скрыто из эфира"
    else if(relationFromMe == "followed")
        followTitle = "Отписаться"
    else if(relationFromMe == "requested")
        followTitle = "Отменить заявку"
    else if(privacy != "followers")
        followTitle = "Подписаться"
    else
        followTitle = "Отправить заявку"

    followBtn.attr("title", followTitle)

    var permit = $("#permit-rel")
    var cancel = $("#cancel-rel")
    var requested = relationToMe == "requested"
    var followed  = relationToMe === "followed"
    permit.attr("hidden", !requested)
    cancel.attr("hidden", mePrivacy != "followers" || (!requested && !followed))

    if(requested)
        cancel.attr("title", "Отклонить заявку")
    else
        cancel.attr("title", "Отписать")

    var blacklist = $("#blacklist")
    if(relationFromMe == "ignored")
        blacklist.text("Разблокировать")
    else
        blacklist.text("Заблокировать")

    var hidePosts = $("#hide-posts")
    if(relationFromMe == "hidden")
        hidePosts.text("Не скрывать из эфира")
    else
        hidePosts.text("Скрывать из эфира")
}

updateRelations()

$(".file-upload__input").change(function(){
    var input = $(this)
    var fileName = input.val().split('/').pop().split('\\').pop();
    input.prev().text(fileName)
})

$(function(){
    var el = $("#user-days")
    var date = el.data("createdAt")
    date = formatDate(date)
    el.attr("title", date)
})

$("#invite-user").on("show.bs.modal", function() {
    var list = $("#invite-list")

    if(list.length > 0)
        return

    $.ajax({
        url: "/account/invites",
        dataType: "json",
        success: function(resp) {
            var send = $("#send-invite")

            if(!resp.invites) {
                var msg = "У тебя пока нет свободных приглашений."
                send.before('<div id="invite-list" class="alert alert-secondary" role="alert">' + msg + '</div>')
                    .addClass("hidden")
                return
            }

            send.before('<select id="invite-list" class="selectpicker form-control" name="invite"></select>')
            list = $("#invite-list")

            for(var i = 0; i < resp.invites.length; i++) {
                var inv = resp.invites[i]
                list.append("<option value='" + inv + "'>" + inv + "</option>")
            }

            $('.selectpicker').selectpicker("refresh")
            send.removeClass("disabled")
        },
        error: showAjaxError,
    })
})

$("#send-invite").click(function(){
    if($(this).hasClass("disabled"))
        return false

    $("#user-inviter").ajaxSubmit({
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function() {
            $("#invite-user").modal("hide")
            $("#give-invite").addClass("hidden")

            var meName = $("body").data("meName")
            var meShowName = $("body").data("meShowName")
            $("#invited-by").removeClass("hidden")
                .find("a").attr("href", "/users/" + meName).text(meShowName)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            $("#send-invite").addClass("hidden")
                .before('<div class="alert alert-danger" role="alert">' + resp.message + '</div>')
        },
    })

    return false
})

$("#hide-follow-update").click(function(){
    document.cookie = "show-follow-update=false;path=/users/;max-age=15768000"
    $("#follow-update").remove()
    return false
})
