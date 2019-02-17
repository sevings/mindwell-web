$("#follow").click(function() {
    return setRelationFromMe("followed")
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
    
    var followBtn = $("#follow")

    var followColor
    if(relationFromMe == "followed")
        followColor = "bg-blue"
    else if(relationFromMe == "requested")
        followColor = "bg-breez"
    else
        followColor = "bg-grey"

    followBtn.removeClass("bg-blue bg-breez bg-grey").addClass(followColor)

    var ignored = relationToMe == "ignored" || relationFromMe == "ignored"
    followBtn.toggleClass("disabled", ignored)

    var followTitle

    if(relationToMe == "ignored")
        followTitle = "Ты в черном списке"
    else if(relationFromMe == "ignored")
        followTitle = "В черном списке"
    else if(relationFromMe == "followed")
        followTitle = "Отписаться"
    else if(relationFromMe == "requested")
        followTitle = "Отменить заявку"
    else if(privacy == "all")
        followTitle = "Подписаться"
    else
        followTitle = "Отправить заявку"

    followBtn.attr("title", followTitle)

    var permit = $("#permit-rel")
    var cancel = $("#cancel-rel")
    var requested = relationToMe == "requested"
    var followed  = relationToMe === "followed"
    permit.attr("hidden", !requested)
    cancel.attr("hidden", mePrivacy == "all" || (!requested && !followed))

    if(requested)
        cancel.attr("title", "Отклонить заявку")
    else
        cancel.attr("title", "Отписать")

    var blockText
    if(relationFromMe == "ignored")
        blockText = "Разблокировать"
    else
        blockText = "Заблокировать"

    var blacklist = $("#blacklist")
    blacklist.text(blockText)
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
