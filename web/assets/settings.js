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

$(".invite").val(function(i, invite) {
    return document.location.protocol + "//" + document.location.host 
            + "/index.html?invite=" + encodeURIComponent(invite)
})

$(".invite").click(function() {
    // https://stackoverflow.com/a/7436574
    var input = this;
    setTimeout(function() {
        input.setSelectionRange(0, 9999);
    }, 1);
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
