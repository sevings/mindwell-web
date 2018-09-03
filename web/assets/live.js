$("#live-section").change(function(){
    var section = $(this).val()
    window.location.search = "section=" + section
})
