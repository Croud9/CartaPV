# $('#select_config').empty();
# $('#select_config').append($('<option>Выберите</option>'));
# <% @configs.each do |config|%>
#   $('#select_config').append($('<option> value="config.title" </option>'));
# <% end %>

$("#select_config").empty()
   .append("<%= escape_javascript(render(:partial => @configs)) %>")