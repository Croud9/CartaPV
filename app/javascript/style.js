document.addEventListener("turbo:load", function() {
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
        if (e.target.type !== 'range') {
            target = document.getElementById('range')
        } 
        const min = target.min
        const max = target.max
        const val = target.value
        
        target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%'
        }

        rangeInputs.forEach(input => {
        input.addEventListener('input', handleInputChange)
        })

        numberInput.addEventListener('input', handleInputChange)

        $('#map').ready(function(){
          //Будет ждать загрузки только DOM-дерева
          $('.btns-in-map').show();
        });
    };
});