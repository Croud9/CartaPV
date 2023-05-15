class AddColumnTitleAreaConfigs < ActiveRecord::Migration[7.0]
  def change
    add_column :area_configs, :title, :string, null: false
  end
end
