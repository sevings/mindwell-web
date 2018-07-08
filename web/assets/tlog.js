$("#follow").click(function() {
    setRelationFromMe("followed")
    return false
})

$("#blacklist").click(function() {
    setRelationFromMe("ignored")
    return false
})

$("#permit-rel").click(function() {
    handleFriendRequest("PUT")
    return false
})

$("#cancel-rel").click(function() {
    handleFriendRequest("DELETE")
    return false
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
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
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
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            alert(resp.message)
        },
    })    
}

function updateRelations() {
    var profile = $("#profile")
    var privacy = profile.data("privacy")
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
    permit.attr("hidden", !requested)
    cancel.attr("hidden", !requested)

    var blockText
    if(relationFromMe == "ignored")
        blockText = "Разблокировать"
    else
        blockText = "Заблокировать"

    var blacklist = $("#blacklist")
    blacklist.text(blockText)
}

$(updateRelations)

$("#verify-email a").click(function() { 
    var p = $("#verify-email")
    $.ajax({
        url: "/account/verification",
        method: "POST",
        success: function() {
            p.text("Письмо с кодом подтверждения отправлено на почту.")
            p.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            p.text("При выполнении запроса произошла ошибка: " + resp.message)
        },
    })

    return false
})

$(".file-upload__input").change(function(){
    var input = $(this)
    var fileName = input.val().split('/').pop().split('\\').pop();
    input.prev().text(fileName)
})
