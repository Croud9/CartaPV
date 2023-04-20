class CreatePvModules < ActiveRecord::Migration[7.0]
  def change
    create_table :pv_modules do |t|
      t.string :manufacturer, :model, null: false
      t.float :width, :height, null: false
      t.text :all_params
      
      t.timestamps
    end
  end
end
