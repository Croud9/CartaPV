document.addEventListener("turbo:load", function() {
  if (document.getElementById("map") !== null) {
    
    // $('#select_config').slideUp();
    $('#select_config').fadeOut();
    // $('#btn-draw-area').fadeOut();
    // $('#btn-draw-pv').fadeOut();
    $('#data').fadeTo(200, 0);
    $('#select_project').change(function() {

        $('#select_config').fadeIn(500);
        $('#select_config').empty();
        $('#data').fadeTo(500, 0);
        $('#btn-draw-area').fadeOut();
        $('#btn-draw-pv').fadeOut();
        $.ajax({
          url: "get_configs_by_project",
          data: "id=" + $("#select_project option:selected").val(),
          success: null,
          dataType: "script",
        });
      });
      
    $('#select_config').change(function() {
      
      if ($('#select_config option:selected').text() == "Выберите") {
        $('#data').fadeTo(500, 0);
        $('#btn-draw-area').fadeOut();
        $('#btn-draw-pv').fadeOut();
      }
      else {
        $('#data').fadeTo(1000, 1);
        $('#btn-draw-area').fadeIn(500);
        $('#btn-draw-pv').fadeIn(500);
        $.ajax({
          url: "get_config_params",
          data: "id=" + $("#select_config option:selected").val(),
          success: null,
          dataType: "script",
        });
      };
    });

  };
});