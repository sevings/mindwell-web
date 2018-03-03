function permitFriend(id) {
    var req = new XMLHttpRequest()
    req.open('PUT', '/relations/from/' + id, true)
    updateRelationToMe(req)
}

function cancelFriend(id) {
    var req = new XMLHttpRequest()
    req.open('DELETE', '/relations/from/' + id, true)
    updateRelationToMe(req)
}

function updateRelationToMe(req) {
    req.onreadystatechange = updateRelation
    req.send()

    var permit = document.getElementById("permit_rel")
    var cancel = document.getElementById("cancel_rel")
    permit.disabled = cancel.disabled = true

    function updateRelation() {
        if(req.readyState != XMLHttpRequest.DONE)
            return

        permit.disabled = cancel.disabled = false

        var resp = JSON.parse(req.responseText)
        if(req.status != 200) {
            alert(resp.message)
            return
        }

        if(resp.relation == "followed") {
            permit.hidden = true
            cancel.hidden = false
            cancel.innerText = "Отписать"
        }
        else if(resp.relation == "none") {
            permit.hidden = true
            cancel.hidden = true

            var none = document.getElementById("none_rel")
            none.hidden = false
        }
        else {
            console.log(resp)
        }
    }
}

function followUser(id, privacy, relationToMe) {
    var req = new XMLHttpRequest()
    req.open('PUT', '/relations/to/' + id + "?r=followed", true)
    updateRelationFromMe(req, privacy, relationToMe)
}

function ignoreUser(id, privacy, relationToMe) {
    var req = new XMLHttpRequest()
    req.open('PUT', '/relations/to/' + id + "?r=ignored", true)
    updateRelationFromMe(req, privacy, relationToMe)
}

function unfollowUser(id, privacy, relationToMe) {
    var req = new XMLHttpRequest()
    req.open('DELETE', '/relations/to/' + id, true)
    updateRelationFromMe(req, privacy, relationToMe)
}

function updateRelationFromMe(req, privacy, relationToMe) {
    req.onreadystatechange = updateRelation
    req.send()

    var follow = document.getElementById("follow")
    var ignore = document.getElementById("ignore")
    var unfollow = document.getElementById("unfollow")
    follow.disabled = ignore.disabled = unfollow.disabled = true

    function updateRelation() {
        if(req.readyState != XMLHttpRequest.DONE)
            return

        follow.disabled = ignore.disabled = unfollow.disabled = false

        var resp = JSON.parse(req.responseText)
        if(req.status != 200) {
            alert(resp.message)
            return
        }

        if(resp.relation == "followed") {
            follow.hidden = true
            ignore.hidden = true
            unfollow.hidden = false
            unfollow.innerText = "Отписаться"
        }
        else if(resp.relation == "requested") {
            follow.hidden = true
            ignore.hidden = true
            unfollow.hidden = false
            unfollow.innerText = "Отменить заявку"
        }
        else if(resp.relation == "ignored") {
            follow.hidden = true
            ignore.hidden = true
            unfollow.hidden = false
            unfollow.innerText = "Разблокировать"
        }
        else if(resp.relation == "none") {
            follow.hidden = relationToMe == "ignored"
            follow.innerText = (privacy == "all" ? "Подписаться" : "Отправить заявку")

            ignore.hidden = false
            unfollow.hidden = true
        }
        else {
            console.log(resp)
        }
    }
}
