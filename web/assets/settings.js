$("#save-password").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#password-status")
    
    $("#change-password").ajaxSubmit({
        resetForm: true,
        success: function() {
            status.text("Пароль изменен.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#save-email").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#email-status")
    
    $("#change-email").ajaxSubmit({
        resetForm: true,
        success: function() {
            status.text("На новую почту отправлено письмо с кодом для подтверждения.")
            status.removeClass("alert-danger")
                .removeClass("alert-secondary")
                .toggleClass("alert-success", true)
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.toggleClass("alert-danger", true)
                .removeClass("alert-secondary")
                .removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#save-email-settings").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#email-settings-status")
    
    $("#email-settings").ajaxSubmit({
        resetForm: false,
        success: function() {
            status.text("Настройки сохранены.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#email-status a").click(function() { 
    var p = $("#email-status")
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

$("a.invite").attr("href", function() {
    var invite = $(this).data("invite")
    return document.location.protocol + "//" + document.location.host 
            + "/index.html?invite=" + encodeURIComponent(invite)
})

$("#save-grandson").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#grandson-status")
    
    $("#grandson").ajaxSubmit({
        success: function() {
            status.text("Адрес сохранен.")
            btn.text("Сохранить")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#gift-sent").change(function(){
    var status = $("#grandfather-status")
    
    var sent = $(this).prop("checked")
    $.ajax({
        url: "/adm/grandfather/status?sent="+sent,
        method: "POST",
        success: function() {
            status.text("Сохранено.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
        },
    })

    return false;
})

$("#gift-received").change(function(){
    var status = $("#grandfather-status")
    
    var received = $(this).prop("checked")
    $.ajax({
        url: "/adm/grandson/status?received="+received,
        method: "POST",
        success: function() {
            status.text("Сохранено.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
        },
    })

    return false;
})
