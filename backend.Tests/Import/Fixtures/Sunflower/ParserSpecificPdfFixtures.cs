namespace BudgetPlanner.Tests.Import.Fixtures.Sunflower;

internal static class ParserSpecificPdfFixtures
{
    private const string EncryptedSyntheticPdfBase64 = "JVBERi0xLjcKJcfsj6IKJSVJbnZvY2F0aW9uOiBncyAtcSAtZEJBVENIIC1kTk9QQVVTRSAtc0RFVklDRT1wZGZ3cml0ZSAtc093bmVyUGFzc3dvcmQ9PyAtc1VzZXJQYXNzd29yZD0/IC1zT3V0cHV0RmlsZT0/ID8KNSAwIG9iago8PC9MZW5ndGggNiAwIFIvRmlsdGVyIC9GbGF0ZURlY29kZT4+CnN0cmVhbQr/nDykV/JTRfdNnUi0jSwglX3PifYtZYS/oNV9QVSSb8QcdL0aTC6mAJLkxVHEw/uW/BOtypGFe4/1rEfxSMyci+dW+ARakSQQ7rv2LQfml/aFyExUVJEyvBdlbmRzdHJlYW0KZW5kb2JqCjYgMCBvYmoKOTAKZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9QYWdlL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL1JvdGF0ZSAwL1BhcmVudCAzIDAgUgovUmVzb3VyY2VzPDwvUHJvY1NldFsvUERGIC9UZXh0XQovRm9udCA4IDAgUgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFsKNCAwIFIKXSAvQ291bnQgMQo+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAzIDAgUgovTWV0YWRhdGEgOSAwIFIKPj4KZW5kb2JqCjggMCBvYmoKPDwvUjcKNyAwIFI+PgplbmRvYmoKNyAwIG9iago8PC9CYXNlRm9udC9IZWx2ZXRpY2EvVHlwZS9Gb250Ci9TdWJ0eXBlL1R5cGUxPj4KZW5kb2JqCjkgMCBvYmoKPDwvVHlwZS9NZXRhZGF0YQovU3VidHlwZS9YTUwvTGVuZ3RoIDExODM+PnN0cmVhbQo8P3hwYWNrZXQgYmVnaW49J++7vycgaWQ9J1c1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCc/Pgo8P2Fkb2JlLXhhcC1maWx0ZXJzIGVzYz0iQ1JMRiI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9J2Fkb2JlOm5zOm1ldGEvJyB4OnhtcHRrPSdYTVAgdG9vbGtpdCAyLjkuMS0xMywgZnJhbWV3b3JrIDEuNic+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIycgeG1sbnM6aVg9J2h0dHA6Ly9ucy5hZG9iZS5jb20vaVgvMS4wLyc+CjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnBkZj0naHR0cDovL25zLmFkb2JlLmNvbS9wZGYvMS4zLycgcGRmOlByb2R1Y2VyPSdHUEwgR2hvc3RzY3JpcHQgMTAuMDAuMCcvPgo8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8nPjx4bXA6TW9kaWZ5RGF0ZT4yMDI2LTA4LTE5VDE2OjUwOjM5LTA1OjAwPC94bXA6TW9kaWZ5RGF0ZT4KPHhtcDpDcmVhdGVEYXRlPjIwMjYtMDgtMTlUMTY6NTA6MzktMDU6MDA8L3htcDpDcmVhdGVEYXRlPgo8eG1wOkNyZWF0b3JUb29sPlVua25vd25BcHBsaWNhdGlvbjwveG1wOkNyZWF0b3JUb29sPjwvcmRmOkRlc2NyaXB0aW9uPgo8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4YXBNTT0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLycgeGFwTU06RG9jdW1lbnRJRD0ndXVpZDo5MTJhNTUxMi1kNDM0LTExZmMtMDAwMC1lZWYwODNmNzJjNTQnLz4KPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJyBkYzpmb3JtYXQ9J2FwcGxpY2F0aW9uL3BkZic+PGRjOnRpdGxlPjxyZGY6QWx0PjxyZGY6bGkgeG1sOmxhbmc9J3gtZGVmYXVsdCc+VW50aXRsZWQ8L3JkZjpsaT48L3JkZjpBbHQ+PC9kYzp0aXRsZT48L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSd3Jz8+CmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9Qcm9kdWNlcihcMjYzXDI2MVwzMzNqXGJcMjc2OVwwMDVjXDIzMiN+XHRcMzY0Z1wyMTBnLVwzMzNcMzI3XDM3NE9cMDM2KQovQ3JlYXRpb25EYXRlKFwyNjBcMzMzXDI0NXp9XDM0MGZOJlwzMjBxOlVcMjY0IFwyMjF7LVwzMDBcMzAwXDM3NFFcdCkKL01vZERhdGUoXDI2MFwzMzNcMjQ1en1cMzQwZk4mXDMyMHE6VVwyNjQgXDIyMXstXDMwMFwzMDBcMzc0UVx0KT4+ZW5kb2JqCjEwIDAgb2JqCjw8L0ZpbHRlciAvU3RhbmRhcmQgL1YgMSAvTGVuZ3RoIDQwIC9SIDIgL1AgLTQgL08gKPjRtsTIIWjjc8aN03nOBEFLnOusOqGllar6XktbJvSHKQovVSAo2tRMYDxBKzGu9J3w+bU5mtJlRRLp5FvuqRLfv+CqmB4pPj4KZW5kb2JqCnhyZWYKMCAxMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDA1MDEgMDAwMDAgbiAKMDAwMDAwMTkxNyAwMDAwMCBuIAowMDAwMDAwNDQyIDAwMDAwIG4gCjAwMDAwMDAzMDEgMDAwMDAgbiAKMDAwMDAwMDEyMyAwMDAwMCBuIAowMDAwMDAwMjgzIDAwMDAwIG4gCjAwMDAwMDA1OTQgMDAwMDAgbiAKMDAwMDAwMDU2NSAwMDAwMCBuIAowMDAwMDAwNjU4IDAwMDAwIG4gCjAwMDAwMDIxNDMgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSAxMSAvUm9vdCAxIDAgUiAvSW5mbyAyIDAgUgovSUQgWzw1OTRBOTM5Nzk2QzQ1NkE4RkM0OTBDM0IwOTA0MkM3Qz48NTk0QTkzOTc5NkM0NTZBOEZDNDkwQzNCMDkwNDJDN0M+XQovRW5jcnlwdCAxMCAwIFIgPj4Kc3RhcnR4cmVmCjIyODQKJSVFT0YK";

    public static byte[] InvalidPdf() => "%PDF-1.4\ntruncated"u8.ToArray();

    public static byte[] ImageOnlyPdf() =>
        SyntheticPdfBuilder.Build(new IReadOnlyList<string>[] { Array.Empty<string>() });

    public static byte[] EncryptedPdf() => Convert.FromBase64String(EncryptedSyntheticPdfBase64);

    public static byte[] ActiveContentPdf() =>
        SyntheticPdfBuilder.Build(
            new IReadOnlyList<string>[] { new[] { "SAFE SYNTHETIC TEXT" } },
            "/OpenAction << /S /JavaScript /JS (app.alert\\(demo\\)) >>");

    public static byte[] PageCountPdf(int pages) =>
        SyntheticPdfBuilder.Build(Enumerable.Range(1, pages)
            .Select(index => (IReadOnlyList<string>)new[] { $"SYNTHETIC PAGE {index}" })
            .ToArray());

    public static byte[] TextVolumePdf(int characters)
    {
        var pages = new List<IReadOnlyList<string>>();
        var pageCount = Math.Min(25, Math.Max(1, (characters + 80_000 - 1) / 80_000));
        for (var page = 0; page < pageCount; page++)
        {
            var remainingPages = pageCount - page;
            var pageCharacters = (characters + remainingPages - 1) / remainingPages;
            var lines = new List<string>();
            while (pageCharacters > 0)
            {
                var length = Math.Min(1_000, pageCharacters);
                lines.Add(new string('X', length));
                pageCharacters -= length;
                characters -= length;
            }
            pages.Add(lines);
        }
        return SyntheticPdfBuilder.Build(pages);
    }

}
