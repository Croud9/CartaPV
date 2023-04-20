Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html
  root "pv_maps#index"
  get "pv_maps", to: "pv_maps#index"
  # get "pv_modules", to: "pv_modules#index"
  # post 'import'
  resources :pv_modules do
    post :import, on: :collection                 
  end
end
