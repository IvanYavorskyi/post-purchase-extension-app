import { useEffect, useState } from "react";
import {
  extend,
  render,
  useExtensionInput,
  BlockStack,
  Button,
  CalloutBanner,
  Heading,
  Image,
  Text,
  TextContainer,
  Separator,
  Tiles,
  TextBlock,
  Layout,
  Select,
  InlineStack,
} from "@shopify/post-purchase-ui-extensions-react";

// For local development, replace APP_URL with your local tunnel URL.
const APP_URL = process.env.APP_URL;

extend(
  "Checkout::PostPurchase::ShouldRender",
  async ({ inputData, storage }) => {
    const postPurchaseOffer = await fetch(`${APP_URL}/api/offer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${inputData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referenceId: inputData.initialPurchase.referenceId,
      }),
    }).then((response) => response.json());

    await storage.update(postPurchaseOffer);

    return { render: true };
  },
);

render("Checkout::PostPurchase::Render", () => <App />);

export function App() {
  const { storage, inputData, calculateChangeset, applyChangeset, done } =
    useExtensionInput();
  const [loading, setLoading] = useState(true);
  const [calculatedPurchase, setCalculatedPurchase] = useState();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");

  const currencyCode =
    inputData.initialPurchase?.totalPriceSet?.presentmentMoney?.currencyCode;

  const { offer } = storage.initialData;

  const purchaseOption = offer;

  useEffect(() => {
    async function calculatePurchase() {
      // Call Shopify to calculate the new price of the purchase, if the above changes are applied.
      const result = await calculateChangeset({
        changes: purchaseOption.changes,
      });

      setCalculatedPurchase(result.calculatedPurchase);
      setLoading(false);
    }

    calculatePurchase();
  }, [calculateChangeset, purchaseOption.changes, quantity]);

  const shipping =
    calculatedPurchase?.addedShippingLines[0]?.priceSet?.presentmentMoney
      ?.amount;
  const taxes =
    calculatedPurchase?.addedTaxLines[0]?.priceSet?.presentmentMoney?.amount;
  const total =
    (calculatedPurchase?.totalOutstandingSet.presentmentMoney.amount || 0) *
      quantity -
    shipping * (quantity - 1 ? 1 : quantity - 1);
  const discountedPrice =
    (calculatedPurchase?.updatedLineItems[0].totalPriceSet.presentmentMoney
      .amount || 0) * quantity;
  const originalPrice =
    (calculatedPurchase?.updatedLineItems[0].priceSet.presentmentMoney.amount ||
      0) * quantity;

  function getVariantIDBySize(size) {
    const matchingOption = purchaseOption.sizeOptions.find(
      (option) => option.size === size,
    );
    return matchingOption ? matchingOption.variantID : null;
  }

  async function acceptOffer() {
    setLoading(true);

    const variantID =
      purchaseOption.sizeOptions?.length > 0 && selectedSize
        ? getVariantIDBySize(selectedSize)
        : purchaseOption.changes[0].variantID;

    if (!variantID) {
      throw new Error("Invalid product or missing variant ID.");
    }

    const validChanges = [
      {
        type: "add_variant",
        variantID,
        quantity,
        discount: {
          value: 15,
          valueType: "percentage",
          title: "15% off",
        },
      },
    ];

    validChanges.push({
      type: "add_shipping_line",
      price: 10,
      title: "Standard Shipping",
    });

    if (validChanges.length === 0) {
      throw new Error("No changes available to apply.");
    }

    const token = await fetch(`${APP_URL}/api/sign-changeset`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${inputData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referenceId: inputData.initialPurchase.referenceId,
        changes: validChanges,
      }),
    })
      .then((response) => response.json())
      .then((response) => response.token);

    await applyChangeset(token);

    done();
  }

  function declineOffer() {
    setLoading(true);
    done();
  }

  const handleTimerComplete = () => {
    done();
  };

  return (
    <BlockStack
      spacing="loose"
      style={{
        backgroundColor: "#f9f9f9",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <CalloutBanner>
        <BlockStack spacing="tight">
          <TextContainer>
            <Text size="medium" emphasized>
              It&#39;s not too late to add this to your order
            </Text>
          </TextContainer>

          <CountdownTimer
            initialTime={36000}
            onComplete={handleTimerComplete}
          />

          <TextContainer>
            <Text size="medium">
              Add the {purchaseOption.productTitle} to your order and{" "}
            </Text>
            <Text size="medium" emphasized>
              {purchaseOption.changes[0].discount.title}
            </Text>
          </TextContainer>
        </BlockStack>
      </CalloutBanner>

      <Layout
        media={[
          { viewportSize: "small", sizes: [1, 0, 1], maxInlineSize: 0.9 },
          { viewportSize: "medium", sizes: [532, 0, 1], maxInlineSize: 420 },
          { viewportSize: "large", sizes: [560, 38, 340] },
        ]}
      >
        {/* Product Image with Styling */}
        <Image
          description="product photo"
          source={purchaseOption.productImageURL}
          maxInlineSize="150px"
          style={{
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />

        <BlockStack />

        {/* Content Section */}
        <BlockStack
          spacing="loose"
          style={{
            width: "100%",
            maxWidth: "800px",
            padding: "16px",
          }}
        >
          <Heading>{purchaseOption.productTitle}</Heading>

          <PriceHeader
            discountedPrice={discountedPrice}
            originalPrice={originalPrice}
            currency={currencyCode}
            loading={!calculatedPurchase}
          />

          <ProductDescription description={purchaseOption.productDescription} />

          <BlockStack spacing="tight">
            <Separator />
            <MoneyLine
              label="Subtotal"
              amount={discountedPrice}
              currency={currencyCode}
              loading={!calculatedPurchase}
            />
            <MoneyLine
              label="Shipping"
              amount={shipping}
              currency={currencyCode}
              loading={!calculatedPurchase}
            />
            <MoneyLine
              label="Taxes"
              amount={taxes}
              currency={currencyCode}
              loading={!calculatedPurchase}
            />
            <Separator />
            <MoneySummary label="Total" amount={total} />
          </BlockStack>

          {/* Quantity Selection */}
          <BlockStack spacing="tight">
            <Text size="medium" emphasized>
              Quantity:
            </Text>

            <InlineStack spacing="extraTight" inlineAlignment="center">
              {/* Decrement Button */}
              <Button
                disabled={quantity <= 1}
                onPress={() => setQuantity((prev) => Math.max(prev - 1, 1))}
                appearance="secondary"
                monochrome
                accessibilityLabel="Decrease quantity"
              >
                <TextContainer alignment="center">
                  <Text size="large" alignment="center">
                    -
                  </Text>
                </TextContainer>
              </Button>

              {/* Quantity Display */}
              <TextContainer
                style={{
                  width: "60px",
                  height: "40px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
                accessibilityLabel={`Quantity: ${quantity}`}
              >
                <Text size="medium" alignment="center" emphasized>
                  {quantity}
                </Text>
              </TextContainer>

              {/* Increment Button */}
              <Button
                onPress={() => setQuantity((prev) => prev + 1)}
                appearance="secondary"
                monochrome
                accessibilityLabel="Increase quantity"
              >
                <TextContainer alignment="center">
                  <Text size="large" alignment="center">
                    +
                  </Text>
                </TextContainer>
              </Button>
            </InlineStack>
          </BlockStack>

          {purchaseOption.sizeOptions?.length > 0 && (
            <TextContainer>
              <Text size="medium" emphasized>
                Select Size:
              </Text>
              <Select
                label="Size"
                value={selectedSize}
                onChange={setSelectedSize}
                options={[
                  { label: "Choose size", value: "", disabled: true },
                  ...purchaseOption.sizeOptions.map((size) => ({
                    label: size.size,
                    value: size.size,
                  })),
                ]}
              />
            </TextContainer>
          )}

          <BlockStack spacing="extraLoose">
            <Button onPress={acceptOffer} submit loading={loading}>
              Pay now · {formatCurrency(total)}
            </Button>
            <Button onPress={declineOffer} subdued loading={loading}>
              Decline this offer
            </Button>
          </BlockStack>
        </BlockStack>
      </Layout>
    </BlockStack>
  );
}

function PriceHeader({ discountedPrice, originalPrice, currency, loading }) {
  return (
    <TextContainer alignment="leading" spacing="loose">
      <Text role="deletion" size="large">
        {!loading && formatCurrency(originalPrice, currency)}
      </Text>
      <Text emphasized size="large" appearance="critical">
        {" "}
        {!loading && formatCurrency(discountedPrice, currency)}
      </Text>
    </TextContainer>
  );
}

function ProductDescription({ description }) {
  return (
    <BlockStack spacing="xtight">
      <TextBlock subdued>{description}</TextBlock>
    </BlockStack>
  );
}

function MoneyLine({ label, amount, currency, loading = false }) {
  return (
    <Tiles>
      <TextBlock size="small">{label}</TextBlock>
      <TextContainer alignment="trailing">
        <TextBlock emphasized size="small">
          {loading ? "-" : formatCurrency(amount, currency)}
        </TextBlock>
      </TextContainer>
    </Tiles>
  );
}

function MoneySummary({ label, amount, currency }) {
  return (
    <Tiles>
      <TextBlock size="medium" emphasized>
        {label}
      </TextBlock>
      <TextContainer alignment="trailing">
        <TextBlock emphasized size="medium">
          {formatCurrency(amount, currency)}
        </TextBlock>
      </TextContainer>
    </Tiles>
  );
}

function formatCurrency(amount, currency = "USD") {
  if (!amount || parseFloat(amount) === 0) {
    return "Free";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(amount);
}

function CountdownTimer({ initialTime, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  const days = Math.floor(timeLeft / (60 * 60 * 24));
  const hours = Math.floor((timeLeft % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
  const seconds = timeLeft % 60;

  return (
    <TextContainer>
      <Text size="medium" emphasized>
        Special Offer Ends In:{" "}
      </Text>
      <Text size="large" appearance="critical">
        {days > 0 && `${days}d `}
        {hours.toString().padStart(2, "0")}h:
        {minutes.toString().padStart(2, "0")}m:
        {seconds.toString().padStart(2, "0")}s
      </Text>
    </TextContainer>
  );
}
