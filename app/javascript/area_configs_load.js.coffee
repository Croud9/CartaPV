
# $('#select_project').change(function() {
#   $('#select_config').html.empty;
#   $.get("pv_maps/find_configs", "id=" + $("#select_project option:selected").val(), null, "script");
#   return false;
# });

$ ->
  $(document).on 'change', '#select_project', (evt) ->
    $.ajax "pv_maps/find_configs",
      type: 'GET'
      dataType: 'script'
      data: {
        country_id: $("#select_project option:selected").val()
      }
      error: (jqXHR, textStatus, errorThrown) ->
        console.log("AJAX Error: #{textStatus}")
      success: (data, textStatus, jqXHR) ->
        console.log("Dynamic country select OK!")