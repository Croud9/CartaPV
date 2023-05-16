Rails.application.routes.draw do
  root "pv_maps#index"
  get "pv_maps", to: "pv_maps#index"
  get "get_configs_by_project", to: "pv_maps#get_configs_by_project"
  get "get_config_params", to: "pv_maps#get_config_params"
  post "set_configuration", to: "pv_maps#set_configuration"
  get "export_pdf", to: "export#show"
  post 'update_model/:id', to: "pv_modules#update_model", as: 'update_model'

  resources :pv_modules do
    collection do
      post :import                               
    end
  end

  resources :projects, :area_configs do
  end
end
