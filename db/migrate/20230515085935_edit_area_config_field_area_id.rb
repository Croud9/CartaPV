class EditAreaConfigFieldAreaId < ActiveRecord::Migration[7.0]
  def change
    change_column_null :area_configs, :area_id, true
  end
end
