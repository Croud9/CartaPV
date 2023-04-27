class ExportPdf 

  include Prawn::View

  def initialize
    set_fonts
    content
  end
  
  def set_fonts
    font_families.update(
      "Verdana" => {
        :bold => "vendor/assets/fonts/verdana_b.ttf",
        :italic => "vendor/assets/fonts/verdana_i.ttf",
        :normal  => "vendor/assets/fonts/verdana.ttf" })
    font "Verdana", :size => 10
  end

  def content
    text "Отчет за #{Time.zone.now.strftime('%b %Y')}", :size => 15, :style => :bold, :align => :center
    move_down(50)
    # top_layer = "assets/images/area_icon.png"
    # image top_layer

    
    # добавим время создания внизу страницы
    creation_date = Time.zone.now.strftime("Отчет сгенерирован %e %b %Y в %H:%M")
    go_to_page(page_count)
    move_down(710)
    text creation_date, :align => :right, :style => :italic, :size => 9

    text "Hello World!"
    text "Отчет"
    # // here comes more code for generating PDF content
  end
end

