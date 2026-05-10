export default function SetupGuide() {
  return (
    <s-page heading="Shoelaces setup guide">
      <s-section heading="1. Create a new page">
        <s-unordered-list>
          <s-list-item>
            In your Shopify admin, go to <strong>Online Store</strong>.
          </s-list-item>
          <s-list-item>
            Open <strong>Pages</strong>, then click <strong>Add page</strong>.
          </s-list-item>
          <s-list-item>
            Create a new page for the shoelaces configurator. Example page name:
            <strong> Shoelaces Customizer</strong>.
          </s-list-item>
          <s-list-item>
            Save the page and remember the page URL/handle. You will use this
            page in the theme editor.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="2. Open the theme editor">
        <s-unordered-list>
          <s-list-item>
            Go to <strong>Online Store</strong>, then open{" "}
            <strong>Themes</strong>.
          </s-list-item>
          <s-list-item>
            Beside your active theme, click <strong>Customize</strong>.
          </s-list-item>
          <s-list-item>
            In the theme editor, use the page selector at the top to open the
            new page you created.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="3. Add the Shoelaces App block">
        <s-unordered-list>
          <s-list-item>
            On the new page template, click <strong>Add section</strong> or{" "}
            <strong>Add block</strong>.
          </s-list-item>
          <s-list-item>
            Choose the app block named <strong>Shoelaces App</strong>.
          </s-list-item>
          <s-list-item>
            Place the Shoelaces App block where you want the configurator to
            appear on the page.
          </s-list-item>
          <s-list-item>
            Click <strong>Save</strong> in the theme editor.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="4. Add a header menu tab">
        <s-unordered-list>
          <s-list-item>
            In Shopify admin, go to <strong>Online Store</strong>, then{" "}
            <strong>Navigation</strong>.
          </s-list-item>
          <s-list-item>
            Open your main menu/header menu.
          </s-list-item>
          <s-list-item>
            Click <strong>Add menu item</strong>.
          </s-list-item>
          <s-list-item>
            Set the menu title. Example: <strong>Customize Shoelaces</strong>.
          </s-list-item>
          <s-list-item>
            Link it to the new page you created for the Shoelaces App.
          </s-list-item>
          <s-list-item>
            Save the menu.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="5. Test the setup">
        <s-unordered-list>
          <s-list-item>
            Open your storefront and click the new header tab.
          </s-list-item>
          <s-list-item>
            Confirm it redirects to the new shoelaces page.
          </s-list-item>
          <s-list-item>
            Confirm the <strong>Shoelaces App</strong> configurator appears on
            the page.
          </s-list-item>
          <s-list-item>
            Test selecting colors/options and make sure the app works properly.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Admin checklist">
        <s-unordered-list>
          <s-list-item>Create a new Shopify page.</s-list-item>
          <s-list-item>Add the Shoelaces App block in the theme editor.</s-list-item>
          <s-list-item>Save the theme changes.</s-list-item>
          <s-list-item>Add a header menu tab that links to the new page.</s-list-item>
          <s-list-item>Test the page on the live storefront.</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}