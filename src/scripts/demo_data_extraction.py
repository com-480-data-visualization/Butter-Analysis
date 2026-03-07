
import pandas as pd
import matplotlib.pyplot as plt
import os

# Construct the path to the dataset
# The script is in src/scripts, and the dataset is in datasets/dairy_consumer_prices
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dataset_path = os.path.join(base_dir, 'datasets', 'dairy_consumer_prices', 'dairy_products_consumer_prices.csv')

# Load the dataset
df = pd.read_csv(dataset_path)

# Filter for Gruyère products
gruyere_df = df[df['product_category'] == 'Gruyère']

# Convert 'month' to datetime objects
gruyere_df['month'] = pd.to_datetime(gruyere_df['month'])

# Calculate the average price for each month
average_price_per_month = gruyere_df.groupby(['month', 'exact_product'])['price_value'].mean().reset_index()

# Plotting
plt.figure(figsize=(12, 6))
for product in average_price_per_month['exact_product'].unique():
    product_df = average_price_per_month[average_price_per_month['exact_product'] == product]
    plt.plot(product_df['month'], product_df['price_value'], marker='o', label={product if product != 'Gruyère' else 'Gruyère Bio'})
plt.title('Average Price of Gruyère Over Time')
plt.xlabel('Month')
plt.ylabel('Average Price (CHF per kg)')
plt.legend()
plt.grid(True)
plt.xticks(rotation=45)
plt.tight_layout()

# Save the plot
output_dir = os.path.join(base_dir, 'public')
if not os.path.exists(output_dir):
    os.makedirs(output_dir)
plt.savefig(os.path.join(output_dir, 'gruyere_price_chart.png'))

print(f"Plot saved to {os.path.join(output_dir, 'gruyere_price_chart.png')}")
