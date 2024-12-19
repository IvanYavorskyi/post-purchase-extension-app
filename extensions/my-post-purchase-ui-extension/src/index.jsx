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
const APP_URL = "https://average-sorts-developments-mat.trycloudflare.com";

// Preload data from your app server to ensure that the extension loads quickly.
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
        quantity,
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
    quantity;
  const discountedPrice =
    calculatedPurchase?.updatedLineItems[0].totalPriceSet.presentmentMoney
      .amount;
  const originalPrice =
    calculatedPurchase?.updatedLineItems[0].priceSet.presentmentMoney.amount;

  async function acceptOffer() {
    setLoading(true);

    const token = await fetch(`${APP_URL}/api/sign-changeset`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${inputData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referenceId: inputData.initialPurchase.referenceId,
        quantity,
        changes: purchaseOption.id,
      }),
    })
      .then((response) => response.json())
      .then((response) => response.token)
      .catch((e) => console.log(e));

    // Make a request to Shopify servers to apply the changeset.
    const applyChangesetResult = await applyChangeset(token);

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
    <BlockStack spacing="loose">
      <CalloutBanner>
        <TextContainer>
          <Text size="medium" emphasized>
            It&#39;s not too late to add this to your order
          </Text>
        </TextContainer>

        <CountdownTimer initialTime={36000} onComplete={handleTimerComplete} />

        <TextContainer>
          <Text size="medium">
            Add the {purchaseOption.productTitle} to your order and{" "}
          </Text>
          <Text size="medium" emphasized>
            {purchaseOption.changes[0].discount.title}
          </Text>
        </TextContainer>
      </CalloutBanner>

      <Layout
        media={[
          { viewportSize: "small", sizes: [1, 0, 1], maxInlineSize: 0.9 },
          { viewportSize: "medium", sizes: [532, 0, 1], maxInlineSize: 420 },
          { viewportSize: "large", sizes: [560, 38, 340] },
        ]}
      >
        <Image
          description="Product photo"
          source={purchaseOption.productImageURL}
        />

        <BlockStack spacing="loose">
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
            <MoneySummary
              label="Total"
              amount={total}
              currency={currencyCode}
            />
          </BlockStack>

          {/* Quantity Selection */}
          <TextContainer>
            <Text size="medium" emphasized>
              Quantity:
            </Text>
            {/* TODO update to not use select */}
            <Select
              label="Quantity"
              value={String(quantity)}
              onChange={(value) => setQuantity(Number(value))}
              options={[
                { label: "1", value: "1" },
                { label: "2", value: "2" },
                { label: "3", value: "3" },
                { label: "4", value: "4" },
                { label: "5", value: "5" },
              ]}
            />
          </TextContainer>

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
                    label: size,
                    value: size,
                  })),
                ]}
              />
            </TextContainer>
          )}

          {/* Action Buttons */}
          <InlineStack>
            <Button onPress={acceptOffer} submit loading={loading}>
              Pay now · {formatCurrency(total, currencyCode)}
            </Button>
            <Button onPress={declineOffer} subdued loading={loading}>
              Decline this offer
            </Button>
          </InlineStack>
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
