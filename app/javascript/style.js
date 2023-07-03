document.addEventListener("turbo:load", function() {
  ///////////// Multiselect field

  let multiselect_block = document.querySelectorAll(".multiselect_block");
  multiselect_block.forEach(parent => {
      let label = parent.querySelector(".field_multiselect");
      let select = parent.querySelector(".field_select");
      let text = label.innerHTML;
      select.addEventListener("change", function(element) {
          $("#btn_open_pdf").hide();
          let selectedOptions = this.selectedOptions;
          label.innerHTML = "";
          for (let option of selectedOptions) {
              let button = document.createElement("button");
              button.type = "button";
              button.className = "btn_multiselect";
              button.textContent = option.innerHTML;
              button.onclick = _ => {
                  $("#btn_open_pdf").hide();
                  option.selected = false;
                  button.remove();
                  if (!select.selectedOptions.length) label.innerHTML = text
              };
              label.append(button);
          }
      })
  })  
  
  if (document.getElementById("map") !== null) {
        const btn_svg_show = document.getElementById('btn-svg-area-show');
        const svg_area = document.getElementById('svg-area');
        const config_show = document.getElementById('btn-config-show');
        const config_hide = document.getElementById('btn-config-hide');
        const config = document.getElementById('config');
        const check_type_tracker = document.getElementById('type-table1')
        const check_type_fix = document.getElementById('type-table2')
        const range_fix = document.getElementById('angle-fix');
        const range_azimut = document.getElementById('angle-from-azimut');
        const range_azimut_output = document.getElementById('rangevalue2');

        btn_svg_show.addEventListener('click', svgArea)

        $('#type_pdf_report_single').click(function() {
          $('#select_config_pdf').prop('multiple', false);
        })
        
        $('#type_pdf_report_multi').click(function() {
          $('#select_config_pdf').prop('multiple', true);
        })


        function svgArea(e) {
            if (svg_area.style.display == 'none') {
                svg_area.style.display = 'block';
                btn_svg_show.innerHTML = 'Скрыть стол';
            }
            else {
                svg_area.style.display = 'none';
                btn_svg_show.innerHTML = 'Показать стол';
            }
        };
        check_type_fix.onclick = (e) => {
            range_fix.style.display = 'block';
        }
        check_type_tracker.onclick = (e) => {
            range_fix.style.display = 'none';
            range_azimut.value = '0';
            range_azimut_output.innerHTML = '0';
        }

        config_show.onclick = function() {
            if (config.classList.contains('hideToUser')) config.classList.remove('hideToUser' );
            config.classList.remove('hide-slide');
            config.classList.add('show-slide' );
        }

        config_hide.onclick = function() {
            svg_area.style.display = 'none';
            btn_svg_show.innerHTML = 'Показать стол';
            if (config.classList.contains('hideToUser')) config.classList.remove('hideToUser');
            config.classList.add('hide-slide');
            config.classList.remove('show-slide');
        }

        const rangeInputs = document.querySelectorAll('input[type="range"]')
        const numberInput = document.querySelector('input[type="number"]')

        function handleInputChange(e) {
        let target = e.target
        if (target.type !== 'range') {
            target = document.getElementById('range')
        } 
        const min = target.min
        const max = target.max
        const val = target.value

        target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%'
        }

        rangeInputs.forEach(input => {
          input.addEventListener('change', handleInputChange)
        })

        numberInput.addEventListener('change', handleInputChange)

        $('#map').ready(function(){
          $('.btns-in-map').show();
        });

    };
});