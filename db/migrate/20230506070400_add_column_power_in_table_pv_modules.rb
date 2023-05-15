class AddColumnPowerInTablePvModules < ActiveRecord::Migration[7.0]
  def change
    add_column :pv_modules, :power, :float, null: false
  end
end
